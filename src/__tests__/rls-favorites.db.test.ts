/**
 * RLS test for public.favorites (S2-08.1 / #95) — runs against a real
 * Supabase, signed in as the seed accounts: CI's throwaway one on every
 * PR, and the SHARED project after a database merge or when run by hand.
 *
 * Checks the policies in supabase/migrations/0016_create_favorites.sql:
 * - Renters can view, insert, and delete their own favorites.
 * - Renter A cannot view, insert-as, or delete Renter B's favorites.
 * - Landlords cannot insert or view favorites (role enforcement).
 * - Anonymous visitors cannot view or insert favorites.
 *
 * SAFE ON SHARED DATA: tests operate only on renter1's LISTING_1 favorite,
 * checking whether it already exists in beforeAll and restoring it in
 * afterAll (or cleaning up in finally blocks). Refused inserts use a
 * non-existent listing ID so that a broken policy fails on foreign key
 * (23503) instead of persisting orphaned rows.
 *
 * Run with: npm run test:db   (needs .env.local and seed data loaded)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  LANDLORD_A_EMAIL,
  RENTER_B_EMAIL,
  RENTER_EMAIL,
  newClient,
  signedInAs,
} from "./db-helpers";

// Seed listing from supabase/seed.sql
const LISTING_1 = "a1b2c3d4-0000-4000-8000-000000000001";

// Non-existent listing UUID for negative insert tests so foreign key
// constraints (23503) prevent orphaned rows if an RLS policy ever broke.
const NON_EXISTENT_LISTING = "00000000-0000-0000-0000-000000000099";

describe("public.favorites RLS policies (0016 / #95)", () => {
  let renterAClient: SupabaseClient;
  let renterAId: string;
  let renterBClient: SupabaseClient;
  let landlordClient: SupabaseClient;
  let landlordId: string;
  let anonClient: SupabaseClient;
  let hadInitialFavorite = false;

  beforeAll(async () => {
    anonClient = newClient();
    const [renterA, renterB, landlord] = await Promise.all([
      signedInAs(RENTER_EMAIL),
      signedInAs(RENTER_B_EMAIL),
      signedInAs(LANDLORD_A_EMAIL),
    ]);

    renterAClient = renterA.client;
    renterAId = renterA.userId;

    renterBClient = renterB.client;

    landlordClient = landlord.client;
    landlordId = landlord.userId;

    // Record whether renterA already has LISTING_1 saved on the shared database.
    const { data: existing } = await renterAClient
      .from("favorites")
      .select("listing_id")
      .match({ renter_id: renterAId, listing_id: LISTING_1 })
      .maybeSingle();

    hadInitialFavorite = Boolean(existing);

    // Remove only this specific row so tests begin with a known clean state.
    if (hadInitialFavorite) {
      await renterAClient
        .from("favorites")
        .delete()
        .match({ renter_id: renterAId, listing_id: LISTING_1 });
    }
  });

  afterAll(async () => {
    // Restore renterA's LISTING_1 favorite if it was present before tests ran.
    if (hadInitialFavorite) {
      try {
        await renterAClient.from("favorites").insert({
          renter_id: renterAId,
          listing_id: LISTING_1,
        });
      } catch {}
    } else {
      try {
        await renterAClient
          .from("favorites")
          .delete()
          .match({ renter_id: renterAId, listing_id: LISTING_1 });
      } catch {}
    }
  });

  it("allows a renter to insert and select their own favorite", async () => {
    try {
      const { error: insertError } = await renterAClient
        .from("favorites")
        .insert({
          renter_id: renterAId,
          listing_id: LISTING_1,
        });
      expect(insertError).toBeNull();

      const { data, error: selectError } = await renterAClient
        .from("favorites")
        .select("*")
        .eq("renter_id", renterAId);

      expect(selectError).toBeNull();
      // Look for the specific test row instead of expecting data to have length 1,
      // in case renterA has other preexisting favorites on the shared database.
      const saved = data?.find((row) => row.listing_id === LISTING_1);
      expect(saved).toBeDefined();
      expect(saved?.renter_id).toBe(renterAId);
    } finally {
      await renterAClient
        .from("favorites")
        .delete()
        .match({ renter_id: renterAId, listing_id: LISTING_1 });
    }
  });

  it("prevents Renter B from viewing Renter A's favorites", async () => {
    const { error: setupError } = await renterAClient.from("favorites").insert({
      renter_id: renterAId,
      listing_id: LISTING_1,
    });
    expect(setupError).toBeNull();

    try {
      const { data, error } = await renterBClient
        .from("favorites")
        .select("*")
        .eq("renter_id", renterAId);

      expect(error).toBeNull();
      // RLS filters out rows owned by another renter.
      expect(data).toHaveLength(0);
    } finally {
      await renterAClient
        .from("favorites")
        .delete()
        .match({ renter_id: renterAId, listing_id: LISTING_1 });
    }
  });

  it("prevents Renter B from inserting a favorite under Renter A's id", async () => {
    const { error } = await renterBClient.from("favorites").insert({
      renter_id: renterAId,
      listing_id: NON_EXISTENT_LISTING,
    });

    // RLS check fails (auth.uid() != renterAId) with 42501.
    // Uses a non-existent listing_id so if RLS were broken, foreign key (23503)
    // would fail instead of saving an orphaned row.
    expect(error?.code).toBe("42501");
  });

  it("prevents Renter B from deleting Renter A's favorite", async () => {
    const { error: setupError } = await renterAClient.from("favorites").insert({
      renter_id: renterAId,
      listing_id: LISTING_1,
    });
    expect(setupError).toBeNull();

    try {
      const { error } = await renterBClient
        .from("favorites")
        .delete()
        .match({ renter_id: renterAId, listing_id: LISTING_1 });

      expect(error).toBeNull();

      // Verify Renter A's favorite still exists.
      const { data } = await renterAClient
        .from("favorites")
        .select("*")
        .match({ renter_id: renterAId, listing_id: LISTING_1 });
      expect(data).toHaveLength(1);
    } finally {
      await renterAClient
        .from("favorites")
        .delete()
        .match({ renter_id: renterAId, listing_id: LISTING_1 });
    }
  });

  it("prevents a landlord from inserting a favorite", async () => {
    const { error } = await landlordClient.from("favorites").insert({
      renter_id: landlordId,
      listing_id: NON_EXISTENT_LISTING,
    });

    // Role check fails: profiles.role = 'landlord', not 'renter'.
    // Non-existent listing prevents saving an undeletable row if policy ever broke.
    expect(error?.code).toBe("42501");
  });

  it("prevents a landlord from reading favorites", async () => {
    // Add renterA's favorite first to ensure the table isn't empty.
    const { error: setupError } = await renterAClient.from("favorites").insert({
      renter_id: renterAId,
      listing_id: LISTING_1,
    });
    expect(setupError).toBeNull();

    try {
      const { data, error } = await landlordClient
        .from("favorites")
        .select("*");
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    } finally {
      await renterAClient
        .from("favorites")
        .delete()
        .match({ renter_id: renterAId, listing_id: LISTING_1 });
    }
  });

  it("denies unauthenticated visitors from accessing favorites", async () => {
    const { error: selectError } = await anonClient
      .from("favorites")
      .select("*");
    // No grant to anon -> 42501 permission denied.
    expect(selectError?.code).toBe("42501");

    const { error: insertError } = await anonClient.from("favorites").insert({
      renter_id: renterAId,
      listing_id: NON_EXISTENT_LISTING,
    });
    expect(insertError?.code).toBe("42501");
  });

  it("allows a renter to delete their own favorite", async () => {
    const { error: setupError } = await renterAClient.from("favorites").insert({
      renter_id: renterAId,
      listing_id: LISTING_1,
    });
    expect(setupError).toBeNull();

    try {
      const { error: deleteError } = await renterAClient
        .from("favorites")
        .delete()
        .match({ renter_id: renterAId, listing_id: LISTING_1 });

      expect(deleteError).toBeNull();

      const { data } = await renterAClient
        .from("favorites")
        .select("*")
        .match({ renter_id: renterAId, listing_id: LISTING_1 });
      expect(data).toHaveLength(0);
    } finally {
      await renterAClient
        .from("favorites")
        .delete()
        .match({ renter_id: renterAId, listing_id: LISTING_1 });
    }
  });
});
