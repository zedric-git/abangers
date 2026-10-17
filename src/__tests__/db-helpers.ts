/**
 * Shared helpers for the *.db.test.ts suites, which run against the REAL
 * shared Supabase project as the seed accounts from supabase/seed.sql.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Dev-only seed credentials, already public in supabase/seed.sql.
export const SEED_PASSWORD = "Abangers123!";
export const LANDLORD_A_EMAIL = "landlord1@abangers.test";
export const LANDLORD_B_EMAIL = "landlord2@abangers.test";
export const RENTER_EMAIL = "renter1@abangers.test";

/**
 * landlord1's approved verification: the fixed id in supabase/seed.sql
 * (section 3, #206). Its files are in the verification-documents bucket,
 * uploaded by supabase/seed-storage.mjs (part of `npm run db:seed`).
 * landlord2 has no verification at all.
 */
export const LANDLORD_A_SUBMISSION_ID = "b1b2c3d4-0000-4000-8000-000000000001";

/** A fresh client with its own session, so two users don't share one. */
export function newClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env.local first.",
    );
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Signs in as a seed account and returns its client + user id. */
export async function signedInAs(email: string) {
  const client = newClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: SEED_PASSWORD,
  });
  if (error || !data.user) {
    throw new Error(
      `Couldn't sign in as ${email} (${error?.message}). Is the seed data loaded? Run: npm run db:seed`,
    );
  }
  return { client, userId: data.user.id };
}

/** A signed-in seed account: what signedInAs returns. */
export type SeedUser = Awaited<ReturnType<typeof signedInAs>>;
