/**
 * RLS test for public.landlord_visit_availability (S3-01.1 / #104) — runs
 * against a real Supabase, signed in as the seed accounts: CI's throwaway
 * one on every PR, and the SHARED project after a database merge or when
 * run by hand.
 *
 * Checks supabase/migrations/0019_create_landlord_visit_availability.sql:
 * - Reading: any signed-in user (renters, landlords, admin) can read
 *   visit availability; anonymous visitors get 42501 (no grants).
 * - Writing: only landlords can insert or update their own row. Renters,
 *   the admin, another landlord, and anonymous visitors cannot write it.
 * - Deleting: nobody can delete a row (42501).
 *
 * SEED DATA (supabase/seed.sql, section 6): landlord1 and landlord2 have
 * 09:00-17:00 for all 7 days; landlord3 has no row yet.
 *
 * SAFE ON SHARED DATA: allowed writes carry a value that breaks a CHECK
 * rule (23514), so Postgres proves RLS allowed them without saving
 * anything. Denied writes also carry an unsaveable value so even a broken
 * policy couldn't save them.
 *
 * Run with: npm run test:db
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
  ADMIN_EMAIL,
  LANDLORD_A_EMAIL,
  LANDLORD_B_EMAIL,
  LANDLORD_C_EMAIL,
  RENTER_EMAIL,
  newClient,
  signedInAs,
  type SeedUser,
} from "./db-helpers";

const TABLE = "landlord_visit_availability";

const VALID_DAYS = [1, 2, 3, 4, 5, 6, 7];

/** Breaks landlord_visit_availability_hours_check (23514). */
const INVALID_HOURS = {
  available_days: VALID_DAYS,
  start_time: "17:00",
  end_time: "09:00",
};

/** Breaks landlord_visit_availability_days_check (23514). */
const EMPTY_DAYS = {
  available_days: [] as number[],
  start_time: "09:00",
  end_time: "17:00",
};

let landlordA: SeedUser; // landlord1 (has seed hours)
let landlordB: SeedUser; // landlord2 (has seed hours)
let landlordC: SeedUser; // landlord3 (no seed hours)
let renterA: SeedUser; // renter1
let admin: SeedUser;

beforeAll(async () => {
  [landlordA, landlordB, landlordC, renterA, admin] = await Promise.all([
    signedInAs(LANDLORD_A_EMAIL),
    signedInAs(LANDLORD_B_EMAIL),
    signedInAs(LANDLORD_C_EMAIL),
    signedInAs(RENTER_EMAIL),
    signedInAs(ADMIN_EMAIL),
  ]);
});

describe("landlord_visit_availability: seed state", () => {
  it("seeds landlord1 and landlord2 with hours and leaves landlord3 empty", async () => {
    const { data, error } = await renterA.client
      .from(TABLE)
      .select("landlord_id, available_days, start_time, end_time")
      .in("landlord_id", [
        landlordA.userId,
        landlordB.userId,
        landlordC.userId,
      ]);

    expect(error).toBeNull();
    const byLandlord = new Map(
      (data ?? []).map((row) => [row.landlord_id, row]),
    );

    expect(byLandlord.get(landlordA.userId)).toMatchObject({
      available_days: VALID_DAYS,
      start_time: "09:00:00",
      end_time: "17:00:00",
    });
    expect(byLandlord.get(landlordB.userId)).toMatchObject({
      available_days: VALID_DAYS,
      start_time: "09:00:00",
      end_time: "17:00:00",
    });
    expect(byLandlord.has(landlordC.userId)).toBe(false);
  });
});

describe("landlord_visit_availability: reading", () => {
  it("lets authenticated users read visit availability", async () => {
    for (const user of [renterA, landlordA, admin]) {
      const { data, error } = await user.client
        .from(TABLE)
        .select("landlord_id")
        .eq("landlord_id", landlordA.userId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    }
  });

  it("blocks anonymous visitors from reading (42501)", async () => {
    const anon = newClient();
    const { error } = await anon.from(TABLE).select("landlord_id");
    expect(error?.code).toBe("42501");
  });
});

describe("landlord_visit_availability: inserting", () => {
  it("lets a landlord insert their own availability (proven via 23514)", async () => {
    const badHours = await landlordC.client.from(TABLE).insert({
      landlord_id: landlordC.userId,
      ...INVALID_HOURS,
    });
    expect(badHours.error?.code).toBe("23514");
    expect(badHours.error?.message).toContain(
      "landlord_visit_availability_hours_check",
    );

    const emptyDays = await landlordC.client.from(TABLE).insert({
      landlord_id: landlordC.userId,
      ...EMPTY_DAYS,
    });
    expect(emptyDays.error?.code).toBe("23514");
    expect(emptyDays.error?.message).toContain(
      "landlord_visit_availability_days_check",
    );
  });

  it("blocks a landlord from inserting availability for another landlord", async () => {
    const { error } = await landlordA.client.from(TABLE).insert({
      landlord_id: landlordC.userId,
      ...INVALID_HOURS,
    });
    expect(error?.code).toBe("42501");
  });

  it("blocks renters, the admin, and anonymous visitors from inserting", async () => {
    for (const user of [renterA, admin]) {
      const { error } = await user.client.from(TABLE).insert({
        landlord_id: user.userId,
        ...INVALID_HOURS,
      });
      expect(error?.code).toBe("42501");
    }

    const anon = newClient();
    const { error: anonError } = await anon.from(TABLE).insert({
      landlord_id: landlordC.userId,
      ...INVALID_HOURS,
    });
    expect(anonError?.code).toBe("42501");
  });
});

describe("landlord_visit_availability: updating and deleting", () => {
  it("lets a landlord update their own availability (proven via 23514)", async () => {
    const { error } = await landlordA.client
      .from(TABLE)
      .update(INVALID_HOURS)
      .eq("landlord_id", landlordA.userId);

    expect(error?.code).toBe("23514");
    expect(error?.message).toContain("landlord_visit_availability_hours_check");
  });

  it("blocks updating another landlord's row or reassigning landlord_id", async () => {
    // RLS hides other rows from UPDATE, so 0 rows match.
    for (const user of [landlordB, renterA, admin]) {
      const { data, error } = await user.client
        .from(TABLE)
        .update(INVALID_HOURS)
        .eq("landlord_id", landlordA.userId)
        .select("landlord_id");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    }

    // Reassigning own row to another landlord fails WITH CHECK (42501).
    const { error: reassignError } = await landlordA.client
      .from(TABLE)
      .update({ ...INVALID_HOURS, landlord_id: landlordB.userId })
      .eq("landlord_id", landlordA.userId);
    expect(reassignError?.code).toBe("42501");

    const anon = newClient();
    const { error: anonError } = await anon
      .from(TABLE)
      .update(INVALID_HOURS)
      .eq("landlord_id", landlordA.userId);
    expect(anonError?.code).toBe("42501");
  });

  it("blocks everyone from deleting availability rows (42501)", async () => {
    for (const user of [landlordA, renterA, admin]) {
      const { error } = await user.client
        .from(TABLE)
        .delete()
        .eq("landlord_id", landlordA.userId);
      expect(error?.code).toBe("42501");
    }

    const anon = newClient();
    const { error: anonError } = await anon
      .from(TABLE)
      .delete()
      .eq("landlord_id", landlordA.userId);
    expect(anonError?.code).toBe("42501");
  });
});
