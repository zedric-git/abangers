/**
 * RLS test for public.listings (S1-11.3 / #75) — runs against the REAL
 * shared Supabase project, signed in as the seed landlords.
 *
 * Checks the policies in supabase/migrations/0001_init.sql, 0007 and 0010:
 * - Landlord A cannot update, delete, or insert-as Landlord B's listings.
 * - Anonymous visitors can read listings but not write them.
 * - A renter cannot create a listing, even under their own id (#173).
 * - Landlord A can still update their own listing (so we know the
 *   "blocked" results above are RLS working, not every write failing).
 * - A landlord who isn't verified cannot create a listing (#201, 0010),
 *   and createListingAction's own check agrees, but they can still edit
 *   their existing listings.
 *
 * SAFE ON SHARED DATA: every write here is either blocked by RLS (so
 * nothing changes) or writes a listing's current title back to itself.
 * The #201 inserts also use monthly_rent 0, which a CHECK always refuses,
 * so they can never be saved (see neverSavedListing below).
 * If RLS is ever broken and a write gets through, run `npm run db:seed`
 * to restore the seed listings.
 *
 * landlord1 (A) becomes the verified seed landlord and landlord2 (B) stays
 * unverified, both with complete profiles (#206). The #201 cases that need
 * that seed data are added in #206:
 * - A passes RLS (23514 from the CHECK, not 42501);
 * - A with the contact number blanked, and A with no social links but
 *   profile_completed = true, get 42501 (values put back in a `finally`);
 * - B's profile is complete, so B's 42501 is only about verification.
 *
 * Run with: npm run test:db   (needs .env.local and the seed data loaded)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { checkCanCreateListings } from "@/lib/auth/can-create-listings";
import {
  LANDLORD_A_EMAIL,
  LANDLORD_B_EMAIL,
  RENTER_EMAIL,
  newClient,
  signedInAs,
} from "./db-helpers";

// Fixed seed listing ids (see supabase/seed.sql).
const LANDLORD_A_LISTING_ID = "a1b2c3d4-0000-4000-8000-000000000001";
const LANDLORD_B_LISTING_ID = "a1b2c3d4-0000-4000-8000-000000000004";

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

  // #173: the insert policy used to check only auth.uid() = landlord_id.
  it("a renter cannot create a listing, even under their own id", async () => {
    const renter = await signedInAs(RENTER_EMAIL);

    const { data, error } = await renter.client
      .from("listings")
      .insert({
        landlord_id: renter.userId,
        title: "Renter-posted listing (should be blocked)",
        monthly_rent: 1000,
        address: "Nowhere",
        contact_info: "n/a",
      })
      .select("id");

    // If the policy is ever broken, remove the stray row so shared data
    // stays clean (the renter owns it, so the delete policy allows it).
    if (data?.length) {
      await renter.client
        .from("listings")
        .delete()
        .in(
          "id",
          data.map((row) => row.id),
        );
    }

    expect(error?.code).toBe("42501");
  });
});

/**
 * A listing that can never be saved: monthly_rent 0 breaks the
 * listings_monthly_rent_check CHECK. Postgres runs RLS checks *before*
 * CHECK constraints, so the error says which one stopped the insert:
 * 42501 = RLS refused it, 23514 = RLS allowed it and the CHECK stopped it.
 */
function neverSavedListing(ownerId: string) {
  return {
    landlord_id: ownerId,
    title: "RLS test listing (never saved)",
    monthly_rent: 0,
    address: "Nowhere",
    contact_info: "n/a",
  };
}

// #201: only landlords with a complete profile and an approved
// verification can create listings (0010). Existing listings stay up.
describe("listings insert rule: complete profile + approved verification", () => {
  let landlordB: { client: SupabaseClient; userId: string };

  beforeAll(async () => {
    landlordB = await signedInAs(LANDLORD_B_EMAIL);
  });

  it("a landlord who isn't verified cannot create a listing", async () => {
    // This test relies on landlord2 having no approved verification
    // (they stay unverified in the seed data, #206).
    const { data: approved, error: readError } = await landlordB.client
      .from("landlord_verifications")
      .select("id")
      .eq("landlord_id", landlordB.userId)
      .eq("status", "approved");
    expect(readError).toBeNull();
    expect(approved).toEqual([]);

    // A plain insert, without .select(), so only the INSERT policy decides.
    const { error } = await landlordB.client
      .from("listings")
      .insert(neverSavedListing(landlordB.userId));
    expect(error?.code).toBe("42501");
  });

  it("createListingAction's check turns them down too", async () => {
    // Same rule, checked by the app before it inserts (read-only).
    const result = await checkCanCreateListings(
      landlordB.client,
      landlordB.userId,
    );
    expect(result.ok).toBe(false);
  });

  it("a landlord who isn't verified can still edit their existing listing", async () => {
    // 0010 only changed inserts: writing the current title back proves the
    // update policy still lets them in, without changing shared data.
    const { data: own } = await landlordB.client
      .from("listings")
      .select("title")
      .eq("id", LANDLORD_B_LISTING_ID)
      .single();
    expect(own).not.toBeNull();

    const { data, error } = await landlordB.client
      .from("listings")
      .update({ title: own!.title })
      .eq("id", LANDLORD_B_LISTING_ID)
      .select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});
