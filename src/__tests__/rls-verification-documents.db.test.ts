/**
 * Storage policy test for the private verification-documents bucket
 * (S1-15.2 / #200) — runs against the REAL shared Supabase project,
 * signed in as the seed accounts.
 *
 * Checks supabase/migrations/0009_create_verification_documents_bucket.sql:
 * - A landlord can upload into their own "<landlord id>/" folder, but not
 *   into another landlord's folder or outside a folder.
 * - Renters and anonymous visitors can't upload at all.
 * - Only JPEG, PNG and WebP files are accepted, up to 5 MB.
 * - A landlord can list and download their own files and make signed
 *   links to them; other landlords, renters and anonymous visitors can't
 *   (#206).
 * - Nobody can replace, remove or move a file once it's uploaded, not
 *   even its owner, and uploading over one gives "409" (#206).
 *
 * And the admin's read policy in 0014_admin_role_and_verification_review.sql
 * (#255): the admin can list, download and make signed links to every
 * landlord's files (landlord1's approved submission and landlord3's
 * pending one), but can't upload or remove anything.
 *
 * SAFE ON SHARED DATA: nothing here is ever saved. For a file upload,
 * Supabase Storage checks, in this order:
 *   1. the file type → "415" if it isn't JPEG, PNG or WebP
 *   2. RLS           → "403" if the policies don't allow the upload
 *   3. the size, while the bytes stream in → "413" if it's over 5 MB
 * (That's how Storage v1.71.0, the version on the shared project in
 * October 2026, does it — see src/storage/uploader.ts in
 * github.com/supabase/storage.) So the "allowed" cases upload a file
 * 1 byte over 5 MB: a "413", rather than "403" or "415", proves the file
 * type is allowed and RLS let the upload through, and then the size
 * limit stops it before anything is saved.
 *
 * WHICH ERROR FIELD (#213): Storage answers every refused upload with
 * HTTP 400 and puts the real code in the response body, which supabase-js
 * gives us as `error.statusCode`, a string like "403". `error.status` is
 * that HTTP 400 every time, so it can't tell the cases apart (see
 * src/http/error-handler.ts in the same repo).
 *
 * The "blocked" cases upload a tiny JPEG and expect "403". If a policy is
 * ever broken, that tiny file really is saved, and the app can't delete
 * it (landlords have no delete policy, on purpose) — the failing test
 * names the file to delete in the Supabase dashboard.
 *
 * READING, REPLACING AND REMOVING need real files, so those cases use
 * landlord1's sample files: the files of the seed data's approved
 * submission (supabase/seed.sql, #206), which supabase/seed-storage.mjs
 * uploads as part of `npm run db:seed`. If they're missing, run it.
 * Nothing changes there either: a replace sends the bytes the file
 * already has, and if a remove or a move ever got through, the test puts
 * the file back.
 *
 * Run with: npm run test:db   (needs .env.local, the seed data, and
 * migrations 0009 and 0014 pushed to the shared project)
 */

import { readFile } from "node:fs/promises";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  ADMIN_EMAIL,
  LANDLORD_A_EMAIL,
  LANDLORD_A_SUBMISSION_ID,
  LANDLORD_B_EMAIL,
  LANDLORD_C_EMAIL,
  LANDLORD_C_SUBMISSION_ID,
  RENTER_EMAIL,
  newClient,
  signedInAs,
  type SeedUser,
} from "./db-helpers";

const BUCKET = "verification-documents";

/** The bucket's size limit in 0009: 5 MB = 5 * 1024 * 1024 bytes. */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Uploading 5 MB can take a while on a slow connection. */
const BIG_UPLOAD_TIMEOUT_MS = 60_000;

/** A file 1 byte over the limit: Storage refuses it with "413". */
function tooBigFile(type: string) {
  return new Blob([new Uint8Array(MAX_FILE_BYTES + 1)], { type });
}

/** A tiny file of an allowed type, so only RLS can stop it. */
function tinyJpeg() {
  return new Blob(["rls test"], { type: "image/jpeg" });
}

/**
 * Uploads `file` to `path` as `client` and returns Storage's error code
 * ("403", "413", "415", ... — `error.statusCode`, not `error.status`; see
 * the note at the top), or "saved" if the upload went through. A plain
 * upload, never `upsert: true`.
 */
async function uploadStatus(
  client: SupabaseClient,
  path: string,
  file: Blob,
): Promise<string | undefined> {
  const { error } = await client.storage.from(BUCKET).upload(path, file);
  return error ? error.statusCode : "saved";
}

/**
 * Expects the upload to `path` to have been refused with `expected`. If
 * it was saved instead, the message says which file to clean up.
 */
function expectRefused(
  status: string | undefined,
  expected: string,
  path: string,
) {
  expect(
    status,
    `${path} should be refused with ${expected}. If this says "saved", delete that file in the Supabase dashboard (Storage → ${BUCKET}).`,
  ).toBe(expected);
}

describe("verification-documents storage policies", () => {
  let landlordA: { client: SupabaseClient; userId: string };
  let landlordB: { client: SupabaseClient; userId: string };

  beforeAll(async () => {
    landlordA = await signedInAs(LANDLORD_A_EMAIL);
    landlordB = await signedInAs(LANDLORD_B_EMAIL);
  });

  it.each(["image/jpeg", "image/png", "image/webp"])(
    "a landlord can upload a %s file to their own folder (up to 5 MB)",
    async (type) => {
      const path = `${landlordB.userId}/rls-test/too-big.${type.split("/")[1]}`;
      const status = await uploadStatus(
        landlordB.client,
        path,
        tooBigFile(type),
      );
      // "413", not "403" (RLS) or "415" (file type): the type is allowed
      // and RLS let it through, and only the size stopped it. See the
      // note at the top.
      expectRefused(status, "413", path);
    },
    BIG_UPLOAD_TIMEOUT_MS,
  );

  it("a landlord cannot upload into another landlord's folder", async () => {
    const path = `${landlordA.userId}/rls-test/not-mine.jpg`;
    const status = await uploadStatus(landlordB.client, path, tinyJpeg());
    expectRefused(status, "403", path);
  });

  it("a landlord cannot upload outside a folder (the bucket root)", async () => {
    const path = "rls-test-no-folder.jpg";
    const status = await uploadStatus(landlordB.client, path, tinyJpeg());
    expectRefused(status, "403", path);
  });

  it("a renter cannot upload, even into their own folder", async () => {
    const renter = await signedInAs(RENTER_EMAIL);
    const path = `${renter.userId}/rls-test/selfie.jpg`;
    const status = await uploadStatus(renter.client, path, tinyJpeg());
    expectRefused(status, "403", path);
  });

  it("anonymous visitors cannot upload", async () => {
    const path = `${landlordB.userId}/rls-test/anon.jpg`;
    const status = await uploadStatus(newClient(), path, tinyJpeg());
    expectRefused(status, "403", path);
  });

  it.each([
    "image/svg+xml",
    "image/gif",
    "image/heic",
    "application/pdf",
    "text/plain",
  ])("%s files are rejected", async (type) => {
    // Sent to the bucket root, which RLS always blocks: the file type is
    // checked first ("415"), and even if that check were missing, RLS
    // would still stop the upload ("403"), so nothing can be saved.
    const path = "rls-test-wrong-type";
    const status = await uploadStatus(
      landlordB.client,
      path,
      new Blob(["rls test"], { type }),
    );
    expectRefused(status, "415", path);
  });
});

/** Whether `path` is in the bucket, as far as `client` can see. */
async function isInBucket(client: SupabaseClient, path: string) {
  const slash = path.lastIndexOf("/");
  const { data, error } = await client.storage
    .from(BUCKET)
    .list(path.slice(0, slash));
  if (error) throw error;
  return data.some((file) => file.name === path.slice(slash + 1));
}

// #206: reading, replacing and removing, with landlord1's sample files.
describe("verification-documents: reading and keeping files", () => {
  let landlordA: SeedUser;
  let landlordB: SeedUser;
  let renter: SeedUser;
  /** The seed submission's folder: "<landlord1 id>/<submission id>". */
  let folder: string;
  /** The ID front's path in the bucket. */
  let frontPath: string;
  /** What should be there: the sample image seed-storage.mjs uploaded. */
  let frontBytes: Uint8Array<ArrayBuffer>;

  /** The same image as a file to upload: the bytes that are already there. */
  const sameFrontFile = () => new Blob([frontBytes], { type: "image/jpeg" });

  beforeAll(async () => {
    landlordA = await signedInAs(LANDLORD_A_EMAIL);
    landlordB = await signedInAs(LANDLORD_B_EMAIL);
    renter = await signedInAs(RENTER_EMAIL);

    // The seed submission says where its files are (supabase/seed.sql).
    const { data: submission, error } = await landlordA.client
      .from("landlord_verifications")
      .select("id_front_path")
      .eq("id", LANDLORD_A_SUBMISSION_ID)
      .maybeSingle();
    if (error) throw error;
    if (!submission) {
      throw new Error(
        "landlord1 has no seed verification. Run: npm run db:seed",
      );
    }
    frontPath = submission.id_front_path;
    folder = frontPath.slice(0, frontPath.lastIndexOf("/"));

    // Copied into a plain Uint8Array, which `new Blob([...])` accepts (a
    // Node Buffer doesn't type-check there).
    frontBytes = new Uint8Array(
      await readFile(
        new URL("../../supabase/seed-storage/id-front.jpg", import.meta.url),
      ),
    );

    if (!(await isInBucket(landlordA.client, frontPath))) {
      throw new Error(
        `${frontPath} isn't in the ${BUCKET} bucket. Run: npm run db:seed`,
      );
    }
  });

  it("a landlord can list, download and get a signed link for their own files", async () => {
    const { data: files, error: listError } = await landlordA.client.storage
      .from(BUCKET)
      .list(folder);
    expect(listError).toBeNull();
    expect(files?.map((file) => file.name).sort()).toEqual([
      "id-back.jpg",
      "id-front.jpg",
      "selfie.jpg",
    ]);

    const { data: blob, error: downloadError } = await landlordA.client.storage
      .from(BUCKET)
      .download(frontPath);
    expect(downloadError).toBeNull();
    const downloaded = Buffer.from(await blob!.arrayBuffer());
    expect(
      downloaded.equals(frontBytes),
      "the download should be supabase/seed-storage/id-front.jpg",
    ).toBe(true);

    // A short-lived signed link: how the app will show a private file.
    const { data: signed, error: signError } = await landlordA.client.storage
      .from(BUCKET)
      .createSignedUrl(frontPath, 60);
    expect(signError).toBeNull();
    const response = await fetch(signed!.signedUrl);
    expect(response.status).toBe(200);
  });

  it.each([
    ["another landlord", () => landlordB.client],
    ["a renter", () => renter.client],
    ["an anonymous visitor", () => newClient()],
  ])(
    "%s cannot list, download or get a signed link for them",
    async (_who, clientOf) => {
      const client = clientOf();

      // RLS hides the files: the folder looks empty, and the file gets the
      // same "404" as a path with nothing there, so they can't even tell
      // that it exists.
      const { data: files, error: listError } = await client.storage
        .from(BUCKET)
        .list(folder);
      expect(listError).toBeNull();
      expect(files).toEqual([]);

      const { error: downloadError } = await client.storage
        .from(BUCKET)
        .download(frontPath);
      expect(downloadError?.statusCode).toBe("404");

      const { error: signError } = await client.storage
        .from(BUCKET)
        .createSignedUrl(frontPath, 60);
      expect(signError?.statusCode).toBe("404");
    },
  );

  it("a landlord cannot replace their own files (upsert or update)", async () => {
    // Both need an update policy, which this bucket doesn't have ("403").
    // They send the bytes the file already has, so even if a replace got
    // through, nothing would change.
    const { error: upsertError } = await landlordA.client.storage
      .from(BUCKET)
      .upload(frontPath, sameFrontFile(), { upsert: true });
    expect(upsertError?.statusCode).toBe("403");

    const { error: updateError } = await landlordA.client.storage
      .from(BUCKET)
      .update(frontPath, sameFrontFile());
    expect(updateError?.statusCode).toBe("403");
  });

  it('uploading to a path that already has a file gives "409"', async () => {
    const { error } = await landlordA.client.storage
      .from(BUCKET)
      .upload(frontPath, sameFrontFile());
    expect(error?.statusCode).toBe("409");
  });

  it("a landlord cannot remove their own files", async () => {
    try {
      // No delete policy: Storage finds nothing it's allowed to delete, so
      // it removes nothing and returns an empty list (not an error).
      const { data, error } = await landlordA.client.storage
        .from(BUCKET)
        .remove([frontPath]);
      expect(error).toBeNull();
      expect(data).toEqual([]);
      expect(await isInBucket(landlordA.client, frontPath)).toBe(true);
    } finally {
      // If it was ever removed, upload it again so shared data is
      // unchanged.
      if (!(await isInBucket(landlordA.client, frontPath))) {
        await landlordA.client.storage
          .from(BUCKET)
          .upload(frontPath, sameFrontFile());
      }
    }
  });

  it("a landlord cannot move their own files", async () => {
    const movedPath = `${folder}/moved-by-rls-test.jpg`;
    try {
      // A move renames the file, which needs an update policy: Storage
      // finds no file it's allowed to change ("404").
      const { error } = await landlordA.client.storage
        .from(BUCKET)
        .move(frontPath, movedPath);
      expect(error?.statusCode).toBe("404");
      expect(await isInBucket(landlordA.client, frontPath)).toBe(true);
      expect(await isInBucket(landlordA.client, movedPath)).toBe(false);
    } finally {
      // If it was ever moved, move it back.
      if (await isInBucket(landlordA.client, movedPath)) {
        await landlordA.client.storage.from(BUCKET).move(movedPath, frontPath);
      }
    }
  });
});

// #255 (0014): the admin opens every landlord's files, with the same
// short-lived signed links the admin dashboard uses (#256), but can't
// change anything. Nothing is saved: the upload is refused, and if the
// remove ever got through, the test puts the file back.
describe("verification-documents: the admin (0014, #255)", () => {
  let admin: SeedUser;
  let landlordC: SeedUser;
  /** The files of landlord1's approved submission (front, back, selfie). */
  let landlordAFiles: string[];
  /** The files of landlord3's pending passport submission (photo page, selfie). */
  let landlordCFiles: string[];

  /** A seed submission's file paths, read from its row by its landlord. */
  async function filesOf(landlord: SeedUser, submissionId: string) {
    const { data, error } = await landlord.client
      .from("landlord_verifications")
      .select("id_front_path, id_back_path, selfie_path")
      .eq("id", submissionId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new Error(
        `Submission ${submissionId} isn't in the seed data. Run: npm run db:seed`,
      );
    }
    return [data.id_front_path, data.id_back_path, data.selfie_path].filter(
      (path): path is string => typeof path === "string",
    );
  }

  beforeAll(async () => {
    const landlordA = await signedInAs(LANDLORD_A_EMAIL);
    [admin, landlordC] = await Promise.all([
      signedInAs(ADMIN_EMAIL),
      signedInAs(LANDLORD_C_EMAIL),
    ]);
    landlordAFiles = await filesOf(landlordA, LANDLORD_A_SUBMISSION_ID);
    landlordCFiles = await filesOf(landlordC, LANDLORD_C_SUBMISSION_ID);
  });

  it("an admin gets working signed links to every landlord's files", async () => {
    // Both seed submissions: 3 files for landlord1's national ID, 2 for
    // landlord3's passport. seed-storage.mjs uploaded them all.
    const paths = [...landlordAFiles, ...landlordCFiles];
    expect(paths).toHaveLength(5);

    const { data, error } = await admin.client.storage
      .from(BUCKET)
      .createSignedUrls(paths, 60);
    expect(error).toBeNull();
    expect(data).toHaveLength(5);
    for (const link of data ?? []) {
      // Each link has its own error, e.g. for a file the admin can't read.
      expect(link.error, `${link.path}: run npm run db:seed`).toBeNull();
      const response = await fetch(link.signedUrl!);
      expect(response.status, `${link.path}`).toBe(200);
    }
  });

  it("an admin can list a landlord's submission folder", async () => {
    const path = landlordCFiles[0];
    const folder = path.slice(0, path.lastIndexOf("/"));
    const { data, error } = await admin.client.storage
      .from(BUCKET)
      .list(folder);
    expect(error).toBeNull();
    expect(data?.map((file) => file.name).sort()).toEqual([
      "id-front.jpg",
      "selfie.jpg",
    ]);
  });

  it("an admin cannot upload, even into a landlord's folder", async () => {
    // Only landlords upload, and only into their own folder (0009).
    const path = `${landlordC.userId}/rls-test/admin.jpg`;
    const status = await uploadStatus(admin.client, path, tinyJpeg());
    expectRefused(status, "403", path);
  });

  it("an admin cannot remove a landlord's files", async () => {
    // landlord3's passport photo page.
    const path = landlordCFiles[0];
    try {
      // No delete policy: Storage finds nothing it's allowed to delete, so
      // it removes nothing and returns an empty list (not an error).
      const { data, error } = await admin.client.storage
        .from(BUCKET)
        .remove([path]);
      expect(error).toBeNull();
      expect(data).toEqual([]);
      expect(await isInBucket(admin.client, path)).toBe(true);
    } finally {
      // If it was ever removed, landlord3 uploads the same sample again,
      // so shared data is unchanged.
      if (!(await isInBucket(admin.client, path))) {
        const sample = new Uint8Array(
          await readFile(
            new URL(
              "../../supabase/seed-storage/id-front.jpg",
              import.meta.url,
            ),
          ),
        );
        await landlordC.client.storage
          .from(BUCKET)
          .upload(path, new Blob([sample], { type: "image/jpeg" }));
      }
    }
  });
});
