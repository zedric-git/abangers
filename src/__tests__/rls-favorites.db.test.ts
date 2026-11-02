/**
 * RLS test for public.favorites (S2-08.1 / #95) — runs against a real
 * Supabase, signed in as the seed accounts: CI's throwaway one on every
 * PR, and the SHARED project after a database merge or when run by hand.
 *
 * Checks the policies in supabase/migrations/0015_create_favorites.sql:
 * - Renters can view, insert, and delete their own favorites.
 * - Renter A cannot view, insert-as, or delete Renter B's favorites.
 * - Landlords cannot insert or view favorites (role enforcement).
 * - Anonymous visitors cannot view or insert favorites.
 *
 * SAFE ON SHARED DATA: tests operate on test-specific listing bookmarks
 * and clean them up in afterEach/finally blocks.
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

// Seed listings from supabase/seed.sql
const LISTING_1 = "a1b2c3d4-0000-4000-8000-000000000001";
const LISTING_2 = "a1b2c3d4-0000-4000-8000-000000000002";

describe("public.favorites RLS policies (0015 / #95)", () => {
  let renterAClient: SupabaseClient;
  let renterAId: string;
  let renterBClient: SupabaseClient;
  let renterBId: string;
  let landlordClient: SupabaseClient;
  let landlordId: string;
  let anonClient: SupabaseClient;

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
    renterBId = renterB.userId;

    landlordClient = landlord.client;
    landlordId = landlord.userId;

    // Clean up any stale test rows before testing.
    await renterAClient.from("favorites").delete().eq("renter_id", renterAId);
    await renterBClient.from("favorites").delete().eq("renter_id", renterBId);
  });

  afterAll(async () => {
    // Teardown test rows.
    await renterAClient?.from("favorites").delete().eq("renter_id", renterAId);
    await renterBClient?.from("favorites").delete().eq("renter_id", renterBId);
  });

  it("allows a renter to insert and select their own favorite", async () => {
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
    expect(data).toHaveLength(1);
    expect(data?.[0].listing_id).toBe(LISTING_1);
  });

  it("prevents Renter B from viewing Renter A's favorites", async () => {
    const { data, error } = await renterBClient
      .from("favorites")
      .select("*")
      .eq("renter_id", renterAId);

    expect(error).toBeNull();
    // RLS filters out rows owned by another renter.
    expect(data).toHaveLength(0);
  });

  it("prevents Renter B from inserting a favorite under Renter A's id", async () => {
    const { error } = await renterBClient.from("favorites").insert({
      renter_id: renterAId,
      listing_id: LISTING_2,
    });

    // RLS check fails (auth.uid() != renterAId).
    expect(error).not.toBeNull();
  });

  it("prevents Renter B from deleting Renter A's favorite", async () => {
    const { error } = await renterBClient
      .from("favorites")
      .delete()
      .match({ renter_id: renterAId, listing_id: LISTING_1 });

    expect(error).toBeNull();

    // Verify Renter A's favorite still exists.
    const { data } = await renterAClient
      .from("favorites")
      .select("*")
      .eq("listing_id", LISTING_1);
    expect(data).toHaveLength(1);
  });

  it("prevents a landlord from inserting a favorite", async () => {
    const { error } = await landlordClient.from("favorites").insert({
      renter_id: landlordId,
      listing_id: LISTING_1,
    });

    // Role check fails: profiles.role = 'landlord', not 'renter'.
    expect(error).not.toBeNull();
  });

  it("prevents a landlord from reading favorites", async () => {
    const { data } = await landlordClient.from("favorites").select("*");
    expect(data).toHaveLength(0);
  });

  it("denies unauthenticated visitors from accessing favorites", async () => {
    const { error: selectError } = await anonClient
      .from("favorites")
      .select("*");
    // No grant to anon -> 42501 permission denied.
    expect(selectError).not.toBeNull();

    const { error: insertError } = await anonClient.from("favorites").insert({
      renter_id: renterAId,
      listing_id: LISTING_1,
    });
    expect(insertError).not.toBeNull();
  });

  it("allows a renter to delete their own favorite", async () => {
    const { error: deleteError } = await renterAClient
      .from("favorites")
      .delete()
      .match({ renter_id: renterAId, listing_id: LISTING_1 });

    expect(deleteError).toBeNull();

    const { data } = await renterAClient
      .from("favorites")
      .select("*")
      .eq("listing_id", LISTING_1);
    expect(data).toHaveLength(0);
  });
});
