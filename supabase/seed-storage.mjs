// Abangers — development seed files (S1-15, #206)
//
// Uploads the sample ID photos and selfie of landlord1's approved
// verification (supabase/seed.sql, section 3) to the private
// verification-documents bucket (0009). seed.sql can't do this itself:
// SQL can only write Storage's database rows, not the files.
//
// HOW TO RUN: `npm run db:seed` runs this right after seed.sql. On its
// own: `node supabase/seed-storage.mjs`. It needs NEXT_PUBLIC_SUPABASE_URL
// and NEXT_PUBLIC_SUPABASE_ANON_KEY, from .env.local (read automatically,
// like `next dev` does) or from the environment.
//
// NO SERVICE KEY: it signs in as landlord1 with the anon key, like the
// app does, so every upload goes through the bucket's policies.
//
// SAFE TO RE-RUN: a file that's already there is left alone (Storage
// answers "409"). Landlords can't replace or delete their files, on
// purpose, so to change a sample image, delete it in the Supabase
// dashboard (Storage → verification-documents) and run this again.
//
// The images in supabase/seed-storage/ are placeholders: grey cards that
// say SAMPLE. Never put a real ID or a photo of a real person there.

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "verification-documents";

// landlord1's seed submission: the fixed id in seed.sql, section 3.
const SUBMISSION_ID = "b1b2c3d4-0000-4000-8000-000000000001";

// Dev-only seed credentials, already public in supabase/seed.sql.
const EMAIL = "landlord1@abangers.test";
const PASSWORD = "Abangers123!";

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

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error: signInError } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});
if (signInError) {
  fail(
    `couldn't sign in as ${EMAIL} (${signInError.message}). Load seed.sql first: npm run db:seed`,
  );
}

// Read the paths from the row itself (landlords can read their own
// submissions), so they always match what seed.sql wrote.
const { data: submission, error: readError } = await supabase
  .from("landlord_verifications")
  .select("id_front_path, id_back_path, selfie_path")
  .eq("id", SUBMISSION_ID)
  .maybeSingle();
if (readError) {
  fail(`couldn't read landlord1's seed verification (${readError.message}).`);
}
if (!submission) {
  fail(
    `landlord1 has no seed verification (${SUBMISSION_ID}). Load seed.sql first: npm run db:seed`,
  );
}

const paths = [
  submission.id_front_path,
  submission.id_back_path, // null for a passport, which has no back
  submission.selfie_path,
].filter(Boolean);

for (const path of paths) {
  // The sample image has the same name as the file at the end of the
  // path, e.g. ".../id-front.jpg" → supabase/seed-storage/id-front.jpg.
  const fileName = path.split("/").pop();
  const bytes = await readFile(
    new URL(`./seed-storage/${fileName}`, import.meta.url),
  );

  // Sent as a Blob, like the app's uploads (supabase-js sends it as a
  // multipart form). Never `upsert: true`: landlords can't replace files.
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Blob([bytes], { type: "image/jpeg" }));

  // Storage puts its real answer in error.statusCode, not error.status
  // (see AGENTS.md, "Storage errors arrive as HTTP 400").
  if (!error) {
    console.log(`seed-storage: uploaded ${path}`);
  } else if (error.statusCode === "409") {
    console.log(`seed-storage: already there: ${path}`);
  } else {
    fail(`couldn't upload ${path} (${error.statusCode}: ${error.message}).`);
  }
}
