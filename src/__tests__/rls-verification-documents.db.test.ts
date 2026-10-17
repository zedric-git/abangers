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
 *
 * SAFE ON SHARED DATA: nothing here is ever saved. For a file upload,
 * Supabase Storage checks, in this order:
 *   1. the file type → 415 if it isn't JPEG, PNG or WebP
 *   2. RLS           → 403 if the policies don't allow the upload
 *   3. the size, while the bytes stream in → 413 if it's over 5 MB
 * (That's how Storage v1.71.0, the version on the shared project in
 * October 2026, does it — see src/storage/uploader.ts in
 * github.com/supabase/storage.) So the "allowed" cases upload a file
 * 1 byte over 5 MB: a 413, rather than 403 or 415, proves the file type
 * is allowed and RLS let the upload through, and then the size limit
 * stops it before anything is saved.
 *
 * The "blocked" cases upload a tiny JPEG and expect 403. If a policy is
 * ever broken, that tiny file really is saved, and the app can't delete
 * it (landlords have no delete policy, on purpose) — the failing test
 * names the file to delete in the Supabase dashboard.
 *
 * Reading, replacing and deleting need real files in the bucket, which
 * the app could never remove again, so those cases come with
 * landlord1's seed files in #206.
 *
 * Run with: npm run test:db   (needs .env.local, the seed data, and
 * migration 0009 pushed to the shared project)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  LANDLORD_A_EMAIL,
  LANDLORD_B_EMAIL,
  RENTER_EMAIL,
  newClient,
  signedInAs,
} from "./db-helpers";

const BUCKET = "verification-documents";

/** The bucket's size limit in 0009: 5 MB = 5 * 1024 * 1024 bytes. */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Uploading 5 MB can take a while on a slow connection. */
const BIG_UPLOAD_TIMEOUT_MS = 60_000;

/** A file 1 byte over the limit: Storage refuses it with 413. */
function tooBigFile(type: string) {
  return new Blob([new Uint8Array(MAX_FILE_BYTES + 1)], { type });
}

/** A tiny file of an allowed type, so only RLS can stop it. */
function tinyJpeg() {
  return new Blob(["rls test"], { type: "image/jpeg" });
}

/**
 * Uploads `file` to `path` as `client` and returns the error's HTTP
 * status (403, 413, 415, ...), or "saved" if the upload went through.
 * A plain upload, never `upsert: true`.
 */
async function uploadStatus(
  client: SupabaseClient,
  path: string,
  file: Blob,
): Promise<number | "saved" | undefined> {
  const { error } = await client.storage.from(BUCKET).upload(path, file);
  return error ? error.status : "saved";
}

/**
 * Expects the upload to `path` to have been refused with `expected`. If
 * it was saved instead, the message says which file to clean up.
 */
function expectRefused(
  status: number | "saved" | undefined,
  expected: number,
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
      // 413, not 403 (RLS) or 415 (file type): the type is allowed and
      // RLS let it through, and only the size stopped it. See the note at
      // the top.
      expectRefused(status, 413, path);
    },
    BIG_UPLOAD_TIMEOUT_MS,
  );

  it("a landlord cannot upload into another landlord's folder", async () => {
    const path = `${landlordA.userId}/rls-test/not-mine.jpg`;
    const status = await uploadStatus(landlordB.client, path, tinyJpeg());
    expectRefused(status, 403, path);
  });

  it("a landlord cannot upload outside a folder (the bucket root)", async () => {
    const path = "rls-test-no-folder.jpg";
    const status = await uploadStatus(landlordB.client, path, tinyJpeg());
    expectRefused(status, 403, path);
  });

  it("a renter cannot upload, even into their own folder", async () => {
    const renter = await signedInAs(RENTER_EMAIL);
    const path = `${renter.userId}/rls-test/selfie.jpg`;
    const status = await uploadStatus(renter.client, path, tinyJpeg());
    expectRefused(status, 403, path);
  });

  it("anonymous visitors cannot upload", async () => {
    const path = `${landlordB.userId}/rls-test/anon.jpg`;
    const status = await uploadStatus(newClient(), path, tinyJpeg());
    expectRefused(status, 403, path);
  });

  it.each([
    "image/svg+xml",
    "image/gif",
    "image/heic",
    "application/pdf",
    "text/plain",
  ])("%s files are rejected", async (type) => {
    // Sent to the bucket root, which RLS always blocks: the file type is
    // checked first (415), and even if that check were missing, RLS would
    // still stop the upload (403), so nothing can be saved.
    const path = "rls-test-wrong-type";
    const status = await uploadStatus(
      landlordB.client,
      path,
      new Blob(["rls test"], { type }),
    );
    expectRefused(status, 415, path);
  });
});
