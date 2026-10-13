/**
 * RLS test for public.listings (S1-11.3 / #75) — runs against the REAL
 * shared Supabase project, signed in as the seed landlords.
 *
 * Checks the policies in supabase/migrations/0001_init.sql:
 * - Landlord A cannot update, delete, or insert-as Landlord B's listings.
 * - Anonymous visitors can read listings but not write them.
 * - Landlord A can still update their own listing (so we know the
 *   "blocked" results above are RLS working, not every write failing).
 *
 * SAFE ON SHARED DATA: every write here is either blocked by RLS (so
 * nothing changes) or writes a listing's current title back to itself.
 * If RLS is ever broken and a write gets through, run `npm run db:seed`
 * to restore the seed listings.
 *
 * Run with: npm run test:db   (needs .env.local and the seed data loaded)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

// Dev-only seed credentials, already public in supabase/seed.sql.
const SEED_PASSWORD = "Abangers123!";
const LANDLORD_A_EMAIL = "landlord1@abangers.test";
const LANDLORD_B_EMAIL = "landlord2@abangers.test";

// Fixed seed listing ids (see supabase/seed.sql).
const LANDLORD_A_LISTING_ID = "a1b2c3d4-0000-4000-8000-000000000001";
const LANDLORD_B_LISTING_ID = "a1b2c3d4-0000-4000-8000-000000000004";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** A fresh client with its own session, so two users don't share one. */
function newClient(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env.local first.",
    );
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signedInAs(email: string) {
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

describe("listings RLS", () => {
  let landlordA: SupabaseClient;
  let landlordBId: string;
  let landlordBListingTitle: string;

  beforeAll(async () => {
    const a = await signedInAs(LANDLORD_A_EMAIL);
    const b = await signedInAs(LANDLORD_B_EMAIL);
    landlordA = a.client;
    landlordBId = b.userId;

    // Remember B's title so we can prove A's attempts didn't change it.
    const { data, error } = await b.client
      .from("listings")
      .select("title, landlord_id")
      .eq("id", LANDLORD_B_LISTING_ID)
      .single();
    if (error) throw error;
    expect(data.landlord_id).toBe(landlordBId);
    landlordBListingTitle = data.title;
  });

  it("landlord A cannot update landlord B's listing", async () => {
    // RLS doesn't raise an error here — it filters the row out, so the
    // update matches 0 rows. `.select()` returns the rows that changed.
    const { data, error } = await landlordA
      .from("listings")
      .update({ title: "Hijacked by landlord A" })
      .eq("id", LANDLORD_B_LISTING_ID)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: after } = await landlordA
      .from("listings")
      .select("title")
      .eq("id", LANDLORD_B_LISTING_ID)
      .single();
    expect(after?.title).toBe(landlordBListingTitle);
  });

  it("landlord A cannot delete landlord B's listing", async () => {
    const { data, error } = await landlordA
      .from("listings")
      .delete()
      .eq("id", LANDLORD_B_LISTING_ID)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { count } = await landlordA
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("id", LANDLORD_B_LISTING_ID);
    expect(count).toBe(1);
  });

  it("landlord A cannot insert a listing owned by landlord B", async () => {
    const { error } = await landlordA.from("listings").insert({
      landlord_id: landlordBId,
      title: "Should never exist",
      monthly_rent: 1000,
      address: "Nowhere",
      contact_info: "n/a",
    });
    // Insert WITH CHECK failures do raise: Postgres 42501.
    expect(error?.code).toBe("42501");
  });

  it("landlord A can update their own listing", async () => {
    // Write the current title back to itself: proves the policy allows
    // the owner without actually changing shared data.
    const { data: own } = await landlordA
      .from("listings")
      .select("title")
      .eq("id", LANDLORD_A_LISTING_ID)
      .single();
    expect(own).not.toBeNull();

    const { data, error } = await landlordA
      .from("listings")
      .update({ title: own!.title })
      .eq("id", LANDLORD_A_LISTING_ID)
      .select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("anonymous visitors can read but not write listings", async () => {
    const anon = newClient();

    const { data: rows, error: readError } = await anon
      .from("listings")
      .select("id")
      .eq("id", LANDLORD_B_LISTING_ID);
    expect(readError).toBeNull();
    expect(rows).toHaveLength(1);

    // anon has no UPDATE grant at all (0002_grant_table_privileges.sql),
    // so this is a permission error rather than a silent 0-row update.
    const { error: writeError } = await anon
      .from("listings")
      .update({ title: "Hijacked by anon" })
      .eq("id", LANDLORD_B_LISTING_ID);
    expect(writeError?.code).toBe("42501");
  });
});
