/**
 * Shared helpers for the *.db.test.ts suites, which run against a real
 * Supabase as the seed accounts from supabase/seed.sql: CI's throwaway one
 * on every PR, and the SHARED project after a database merge or when you
 * run them by hand (`npm run test:db` reads .env.local).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Dev-only seed credentials, already public in supabase/seed.sql.
export const SEED_PASSWORD = "Abangers123!";
export const LANDLORD_A_EMAIL = "landlord1@abangers.test";
export const LANDLORD_B_EMAIL = "landlord2@abangers.test";
export const LANDLORD_C_EMAIL = "landlord3@abangers.test";
export const RENTER_EMAIL = "renter1@abangers.test";
export const RENTER_B_EMAIL = "renter2@abangers.test";
/** The seed admin (#255): the only admin, made by seed.sql (0014). */
export const ADMIN_EMAIL = "admin@abangers.test";

/**
 * landlord1's approved verification: the fixed id in supabase/seed.sql
 * (section 3, #206), approved by the seed admin. Its files are in the
 * verification-documents bucket, uploaded by supabase/seed-storage.mjs
 * (part of `npm run db:seed`). landlord2 has no verification at all.
 */
export const LANDLORD_A_SUBMISSION_ID = "b1b2c3d4-0000-4000-8000-000000000001";

/**
 * landlord3's verification, waiting for review (#255): the other fixed id
 * in supabase/seed.sql (section 3). A passport, so its files are only the
 * photo page (id-front) and the selfie, also uploaded by seed-storage.mjs.
 */
export const LANDLORD_C_SUBMISSION_ID = "b1b2c3d4-0000-4000-8000-000000000002";

/**
 * The seed viewing requests (#107): the fixed ids in supabase/seed.sql
 * (section 5). Their days count from the day the seed last ran, on the
 * Philippine clock, so run `npm run db:seed` before running the DB tests
 * by hand on a later day.
 */
export const VIEWING_REQUEST_IDS = {
  /** renter2 on landlord1's Santos Boarding House: pending, in 3 days. */
  pending: "c1b2c3d4-0000-4000-8000-000000000001",
  /** renter1 on landlord1's Lahug bedspace: confirmed, yesterday. */
  confirmedYesterday: "c1b2c3d4-0000-4000-8000-000000000002",
  /** renter1 on landlord1's Santos Boarding House: completed. */
  completed: "c1b2c3d4-0000-4000-8000-000000000003",
  /** renter2 on landlord1's Lahug bedspace: declined, with a reason. */
  declined: "c1b2c3d4-0000-4000-8000-000000000004",
  /** renter1 on landlord1's Santos Boarding House: cancelled. */
  cancelled: "c1b2c3d4-0000-4000-8000-000000000005",
  /** renter1 on landlord2's Dela Cruz Dorm: pending, in 3 days. */
  landlordBPending: "c1b2c3d4-0000-4000-8000-000000000006",
  /** renter2 on landlord2's Budget Rooms near USJ-R: confirmed, in 2 days. */
  confirmedSoon: "c1b2c3d4-0000-4000-8000-000000000007",
} as const;

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
