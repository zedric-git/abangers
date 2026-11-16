/**
 * Storage policy test for the public listing-photos bucket (#234) — runs
 * against a real Supabase, signed in as the seed accounts: CI's
 * throwaway one on every PR, and the SHARED project after a database
 * merge or when run by hand.
 *
 * Checks supabase/migrations/0013_lock_down_listing_photos_bucket.sql
 * (and 0006, whose read policy it keeps):
 * - A landlord can upload JPEG, PNG and WebP files into their own
 *   "<landlord id>/" folder, and anyone, even an anonymous visitor, can
 *   view them.
 * - A landlord can't upload into another landlord's folder. Renters and
 *   anonymous visitors can't upload at all.
 * - Anything that isn't JPEG, PNG or WebP is refused ("415"), and so is
 *   anything over 10 MB ("413").
 * - A landlord can replace and delete files in their own folder, but not
 *   delete another landlord's.
 *
 * Not covered: a renter replacing or deleting a file in their own folder.
 * 0013 refuses that too (the update and delete policies check the role),
 * but since a renter can't upload, there's no file of theirs to try it on.
 *
 * WHICH ERROR FIELD (#213): Storage answers every refused upload with
 * HTTP 400 and puts the real code in the response body, which supabase-js
 * gives us as `error.statusCode`, a string like "403". `error.status` is
 * that HTTP 400 every time. For an upload, Storage checks the file type
 * first ("415"), then RLS ("403"), then the size while the bytes stream
 * in ("413") — see rls-verification-documents.db.test.ts.
 *
 * SAFE ON SHARED DATA: every file this suite uploads goes into a folder
 * of its own, "<user id>/rls-test-<run id>/", and `afterAll` deletes
 * whatever is in those folders, as the user who owns them, even if a test
 * failed halfway. Before 0013 is pushed, the renter, type and size cases
 * really do save their files (that's the hole this suite shows); a renter
 * can still delete files in their own folder then (0006), so those go too.
 * If `afterAll` ever can't delete a file, it fails and names it: delete it
 * in the Supabase dashboard (Storage → listing-photos).
 *
 * Run with: npm run test:db   (needs .env.local and the seed data)
 */

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  LANDLORD_A_EMAIL,
  LANDLORD_B_EMAIL,
  RENTER_EMAIL,
  newClient,
  signedInAs,
  type SeedUser,
} from "./db-helpers";

const BUCKET = "listing-photos";

/** The bucket's size limit in 0013: 10 MB = 10 * 1024 * 1024 bytes. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Uploading 10 MB can take a while on a slow connection. */
const BIG_UPLOAD_TIMEOUT_MS = 60_000;

/**
 * This run's folder name, inside each user's own folder. Unique per run,
 * so `afterAll` only ever deletes files this run uploaded.
 */
const TEST_FOLDER = `rls-test-${randomUUID().slice(0, 8)}`;

/** A small file of the given type. Storage goes by the type, not the bytes. */
function smallFile(type: string) {
  return new Blob(["listing-photos rls test"], { type });
}

/** Where a test file for `userId` goes: "<user id>/rls-test-<run id>/<name>". */
function testPath(userId: string, name: string) {
  return `${userId}/${TEST_FOLDER}/${name}`;
}

/**
 * Uploads `file` to `path` as `client` and returns Storage's error code
 * ("403", "413", "415", ... — `error.statusCode`, not `error.status`), or
 * "saved" if the upload went through.
 */
async function uploadStatus(
  client: SupabaseClient,
  path: string,
  file: Blob,
  options: { upsert?: boolean } = {},
): Promise<string | undefined> {
  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, file, { upsert: options.upsert ?? false });
  return error ? error.statusCode : "saved";
}

/** Expects the upload to `path` to have been refused with `expected`. */
function expectRefused(
  status: string | undefined,
  expected: string,
  path: string,
) {
  expect(
    status,
    `${path} should be refused with ${expected}. If this says "saved", the file was uploaded; afterAll deletes it.`,
  ).toBe(expected);
}

/** The names of the files in `folder`, as far as `client` can see. */
async function filesIn(client: SupabaseClient, folder: string) {
  const { data, error } = await client.storage.from(BUCKET).list(folder);
  if (error) throw error;
  return data.map((file) => file.name);
}

/** Whether `path` is in the bucket. Anyone can list it (0006). */
async function isInBucket(path: string) {
  const slash = path.lastIndexOf("/");
  const names = await filesIn(newClient(), path.slice(0, slash));
  return names.includes(path.slice(slash + 1));
}

describe("listing-photos storage policies", () => {
  let landlordA: SeedUser;
  let landlordB: SeedUser;
  let renter: SeedUser;

  beforeAll(async () => {
    landlordA = await signedInAs(LANDLORD_A_EMAIL);
    landlordB = await signedInAs(LANDLORD_B_EMAIL);
    renter = await signedInAs(RENTER_EMAIL);
  });

  // Deletes everything in this run's folders, each as its owner (only the
  // owner's delete policy allows it), then checks nothing is left.
  afterAll(async () => {
    const left: string[] = [];
    for (const user of [landlordA, landlordB, renter]) {
      if (!user) continue; // beforeAll failed before signing them in
      const folder = `${user.userId}/${TEST_FOLDER}`;
      const names = await filesIn(user.client, folder);
      if (names.length > 0) {
        await user.client.storage
          .from(BUCKET)
          .remove(names.map((name) => `${folder}/${name}`));
      }
      for (const name of await filesIn(user.client, folder)) {
        left.push(`${folder}/${name}`);
      }
    }
    expect(
      left,
      `These test files couldn't be deleted. Delete them in the Supabase dashboard (Storage → ${BUCKET}).`,
    ).toEqual([]);
  }, BIG_UPLOAD_TIMEOUT_MS);

  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ])(
    "a landlord can upload a %s photo to their own folder, and anyone can view it",
    async (type, extension) => {
      const path = testPath(landlordA.userId, `allowed.${extension}`);
      const status = await uploadStatus(
        landlordA.client,
        path,
        smallFile(type),
      );
      expect(status).toBe("saved");

      // An anonymous visitor can download it (0006's read policy)...
      const anon = newClient();
      const { error: downloadError } = await anon.storage
        .from(BUCKET)
        .download(path);
      expect(downloadError).toBeNull();

      // ...and open its public URL, which is what listing pages show.
      const { data } = anon.storage.from(BUCKET).getPublicUrl(path);
      const response = await fetch(data.publicUrl);
      expect(response.status).toBe(200);
    },
  );

  it("a landlord cannot upload into another landlord's folder", async () => {
    const path = testPath(landlordB.userId, "not-mine.jpg");
    const status = await uploadStatus(
      landlordA.client,
      path,
      smallFile("image/jpeg"),
    );
    expectRefused(status, "403", path);
  });

  it("a renter cannot upload, even into their own folder", async () => {
    const path = testPath(renter.userId, "renter.jpg");
    const status = await uploadStatus(
      renter.client,
      path,
      smallFile("image/jpeg"),
    );
    expectRefused(status, "403", path);
  });

  it("anonymous visitors cannot upload", async () => {
    const path = testPath(landlordA.userId, "anon.jpg");
    const status = await uploadStatus(
      newClient(),
      path,
      smallFile("image/jpeg"),
    );
    expectRefused(status, "403", path);
  });

  it.each([
    ["image/svg+xml", "logo.svg"],
    ["image/gif", "dance.gif"],
    ["image/heic", "IMG_0001.heic"],
    ["text/plain", "notes.txt"],
  ])("%s files are refused", async (type, name) => {
    // Into the landlord's own folder, so only the file type can stop it.
    const path = testPath(landlordA.userId, name);
    const status = await uploadStatus(landlordA.client, path, smallFile(type));
    expectRefused(status, "415", path);
  });

  it(
    "files over 10 MB are refused",
    async () => {
      // A JPEG in the landlord's own folder, so only the size can stop it.
      const path = testPath(landlordA.userId, "too-big.jpg");
      const status = await uploadStatus(
        landlordA.client,
        path,
        new Blob([new Uint8Array(MAX_FILE_BYTES + 1)], { type: "image/jpeg" }),
      );
      expectRefused(status, "413", path);
    },
    BIG_UPLOAD_TIMEOUT_MS,
  );

  it("a landlord can replace a photo in their own folder", async () => {
    const path = testPath(landlordA.userId, "replace-me.jpg");
    expect(
      await uploadStatus(landlordA.client, path, smallFile("image/jpeg")),
    ).toBe("saved");

    // upsert: true replaces the file, which needs the update policy.
    const status = await uploadStatus(
      landlordA.client,
      path,
      smallFile("image/png"),
      { upsert: true },
    );
    expect(status).toBe("saved");
  });

  it("a landlord can delete a photo in their own folder", async () => {
    const path = testPath(landlordA.userId, "delete-me.jpg");
    expect(
      await uploadStatus(landlordA.client, path, smallFile("image/jpeg")),
    ).toBe("saved");

    const { data, error } = await landlordA.client.storage
      .from(BUCKET)
      .remove([path]);
    expect(error).toBeNull();
    expect(data?.map((file) => file.name)).toEqual([path]);
    expect(await isInBucket(path)).toBe(false);
  });

  it("a landlord cannot delete another landlord's photo", async () => {
    const path = testPath(landlordA.userId, "keep-me.jpg");
    expect(
      await uploadStatus(landlordA.client, path, smallFile("image/jpeg")),
    ).toBe("saved");

    // Storage finds nothing landlord2 is allowed to delete, so it removes
    // nothing and returns an empty list (not an error).
    const { data, error } = await landlordB.client.storage
      .from(BUCKET)
      .remove([path]);
    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(await isInBucket(path)).toBe(true);
  });
});
