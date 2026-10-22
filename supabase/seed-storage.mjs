// Abangers — development seed files (S1-15, #206; listing photos #243)
//
// Uploads the files supabase/seed.sql points to but can't upload itself
// (SQL can only write Storage's database rows, not the files):
//   1. the sample ID photos and selfies of the seed verifications
//      (seed.sql, section 3) to the private verification-documents bucket
//      (0009): landlord1's approved one, and landlord3's pending one for
//      the admin dashboard to review (S2-11, #207);
//   2. a sample listing photo for each seed landlord with listings
//      (landlord1 and landlord2; landlord3 has none), to the public
//      listing-photos bucket (0013), and sets it as the photo and cover
//      photo of that landlord's seed listings (seed.sql, section 4). The
//      listing form requires both, so without it no seed listing could be
//      saved through Edit (#243).
//
// HOW TO RUN: `npm run db:seed` runs this right after seed.sql. On its
// own: `node supabase/seed-storage.mjs`. It needs NEXT_PUBLIC_SUPABASE_URL
// and NEXT_PUBLIC_SUPABASE_ANON_KEY, from .env.local (read automatically,
// like `next dev` does) or from the environment.
//
// NO SERVICE KEY: it signs in as each seed landlord with the anon key,
// like the app does, so every upload and update goes through the
// policies. Since 0013 a landlord can only upload into their own folder,
// so each landlord uploads their own copy of the listing photo.
//
// SAFE TO RE-RUN: a file that's already there is left alone (Storage
// answers "409"). Landlords can't replace or delete their verification
// files, on purpose, so to change a sample image, delete it in the
// Supabase dashboard (Storage → the bucket) and run this again. Setting
// the listings' photos is an update to the same value, so it can run any
// number of times; it also undoes photos added to a seed listing while
// testing (the uploaded files stay in the bucket).
//
// The images in supabase/seed-storage/ are placeholders: grey cards that
// say SAMPLE. Never put a real ID or a photo of a real person there.

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const VERIFICATION_BUCKET = "verification-documents";
const LISTING_PHOTOS_BUCKET = "listing-photos";

// The seed submissions: the fixed ids in seed.sql, section 3.
const LANDLORD1_SUBMISSION_ID = "b1b2c3d4-0000-4000-8000-000000000001";
const LANDLORD3_SUBMISSION_ID = "b1b2c3d4-0000-4000-8000-000000000002";

// Dev-only seed credentials, already public in supabase/seed.sql.
const LANDLORD1_EMAIL = "landlord1@abangers.test";
const LANDLORD2_EMAIL = "landlord2@abangers.test";
const LANDLORD3_EMAIL = "landlord3@abangers.test";
const PASSWORD = "Abangers123!";

// Each seed landlord's listings: the fixed ids in seed.sql, section 4.
const SEED_LISTING_IDS = {
  [LANDLORD1_EMAIL]: [
    "a1b2c3d4-0000-4000-8000-000000000001",
    "a1b2c3d4-0000-4000-8000-000000000002",
    "a1b2c3d4-0000-4000-8000-000000000003",
  ],
  [LANDLORD2_EMAIL]: [
    "a1b2c3d4-0000-4000-8000-000000000004",
    "a1b2c3d4-0000-4000-8000-000000000005",
    "a1b2c3d4-0000-4000-8000-000000000006",
  ],
};

// The sample listing photo, and where it goes in each landlord's folder:
// <landlord id>/seed/listing-sample.jpg. The "seed" folder keeps it apart
// from the photos the app uploads (<landlord id>/<timestamp>-<random>.jpg).
const LISTING_PHOTO_FILE = "listing-sample.jpg";

function fail(message) {
  console.error(`seed-storage: ${message}`);
  process.exit(1);
}

// .env.local sits in the repo root, one folder up from this file.
const envFile = fileURLToPath(new URL("../.env.local", import.meta.url));
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  fail(
    "missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env.local first.",
  );
}

// One client per landlord, so each one's uploads and updates run as them.
// There's no signOut() at the end: its default scope is "global", which
// would also log that seed account out of every browser using it.
async function signInAs(email) {
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) {
    fail(
      `couldn't sign in as ${email} (${error.message}). Load seed.sql first: npm run db:seed`,
    );
  }

  return { supabase, userId: data.user.id };
}

// Uploads one sample image from supabase/seed-storage/, leaving a file
// that's already there alone.
async function uploadSample(supabase, bucket, path, fileName) {
  const bytes = await readFile(
    new URL(`./seed-storage/${fileName}`, import.meta.url),
  );

  // Sent as a Blob, like the app's uploads (supabase-js sends it as a
  // multipart form). Never `upsert: true`: landlords can't replace
  // verification files.
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, new Blob([bytes], { type: "image/jpeg" }));

  // Storage puts its real answer in error.statusCode, not error.status
  // (see AGENTS.md, "Storage errors arrive as HTTP 400").
  if (!error) {
    console.log(`seed-storage: uploaded ${bucket}/${path}`);
  } else if (error.statusCode === "409") {
    console.log(`seed-storage: already there: ${bucket}/${path}`);
  } else {
    fail(
      `couldn't upload ${bucket}/${path} (${error.statusCode}: ${error.message}).`,
    );
  }
}

// ── 1. The seed verifications' files ─────────────────────────────────
// Each landlord uploads their own files: a landlord can only upload into
// their own folder (0009).
const landlord1 = await signInAs(LANDLORD1_EMAIL);
const landlord3 = await signInAs(LANDLORD3_EMAIL);

for (const [email, { supabase }, submissionId] of [
  [LANDLORD1_EMAIL, landlord1, LANDLORD1_SUBMISSION_ID],
  [LANDLORD3_EMAIL, landlord3, LANDLORD3_SUBMISSION_ID],
]) {
  // Read the paths from the row itself (landlords can read their own
  // submissions), so they always match what seed.sql wrote.
  const { data: submission, error: readError } = await supabase
    .from("landlord_verifications")
    .select("id_front_path, id_back_path, selfie_path")
    .eq("id", submissionId)
    .maybeSingle();
  if (readError) {
    fail(`couldn't read ${email}'s seed verification (${readError.message}).`);
  }
  if (!submission) {
    fail(
      `${email} has no seed verification (${submissionId}). Load seed.sql first: npm run db:seed`,
    );
  }

  const verificationPaths = [
    submission.id_front_path,
    submission.id_back_path, // null for a passport, which has no back
    submission.selfie_path,
  ].filter(Boolean);

  for (const path of verificationPaths) {
    // The sample image has the same name as the file at the end of the
    // path, e.g. ".../id-front.jpg" → supabase/seed-storage/id-front.jpg.
    const fileName = path.split("/").pop();
    await uploadSample(supabase, VERIFICATION_BUCKET, path, fileName);
  }
}

// ── 2. Each seed landlord's listing photo ────────────────────────────
const landlord2 = await signInAs(LANDLORD2_EMAIL);

for (const [email, { supabase, userId }] of [
  [LANDLORD1_EMAIL, landlord1],
  [LANDLORD2_EMAIL, landlord2],
]) {
  const path = `${userId}/seed/${LISTING_PHOTO_FILE}`;
  await uploadSample(supabase, LISTING_PHOTOS_BUCKET, path, LISTING_PHOTO_FILE);

  // The same public URL the app saves for an uploaded photo
  // (ImageUploader), so the listing form treats it like any other photo.
  const {
    data: { publicUrl },
  } = supabase.storage.from(LISTING_PHOTOS_BUCKET).getPublicUrl(path);

  // Landlords can update their own listings (0007), so this goes through
  // RLS too. .select() returns the rows that were updated: fewer than
  // expected means seed.sql hasn't created them yet.
  const listingIds = SEED_LISTING_IDS[email];
  const { data: updated, error: updateError } = await supabase
    .from("listings")
    .update({ images: [publicUrl], cover_image: publicUrl })
    .in("id", listingIds)
    .select("id");
  if (updateError) {
    fail(
      `couldn't set the photo on ${email}'s seed listings (${updateError.message}).`,
    );
  }
  if (updated.length !== listingIds.length) {
    fail(
      `found ${updated.length} of ${email}'s ${listingIds.length} seed listings. Load seed.sql first: npm run db:seed`,
    );
  }
  console.log(
    `seed-storage: set the sample photo on ${updated.length} of ${email}'s seed listings`,
  );
}
