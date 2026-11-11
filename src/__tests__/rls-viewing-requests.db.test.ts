/**
 * RLS test for public.viewing_requests (S3-02.1 / #107) — runs against a
 * real Supabase, signed in as the seed accounts: CI's throwaway one on
 * every PR, and the SHARED project after a database merge or when run by
 * hand.
 *
 * Checks supabase/migrations/0017_create_viewing_requests.sql:
 * - Requesting: only a renter, only for themselves, only as a plain
 *   pending request, only for a slot that hasn't started (Philippine
 *   time), and not on a fully occupied listing. Landlords, the admin and
 *   anonymous visitors can't request at all.
 * - landlord_id always comes from the listing, whatever the app sends.
 * - The two 23505 rules: a pending or confirmed request holds the
 *   landlord's slot, and a renter can have only one of them per listing.
 * - Reading: renters see only their own requests, landlords only the
 *   requests on their listings, the admin none, and anonymous visitors
 *   can't read at all. With the status changes below, this also covers
 *   #112: a landlord can't see or act on another landlord's requests.
 * - Status changes (0017's trigger): a landlord confirms or declines a
 *   pending request, and completes a confirmed one once it has started;
 *   a renter cancels a pending or confirmed one before it starts.
 *   Everything else is refused: other changes, final requests, other
 *   people's requests, other columns, and deleting.
 *
 * SEED DATA (supabase/seed.sql, section 5): seven requests with fixed
 * ids, VIEWING_REQUEST_IDS in db-helpers.ts. Their days count from the
 * day the seed ran, so if the first test here fails, run
 * `npm run db:seed` and try again.
 *
 * SAFE ON SHARED DATA: nothing here is ever saved, the same way as in
 * rls-landlord-verifications.db.test.ts. Each write is either refused
 * (42501), or gets past RLS and 0017's trigger and is then stopped by a
 * CHECK rule (23514). Postgres runs the triggers and the policies before
 * the CHECK rules, so a 23514 proves the write was allowed, without
 * keeping it. Writes that should be refused carry a value that breaks a
 * CHECK rule too, so even a broken policy or trigger couldn't save them.
 *
 * The exception is the two 23505 tests. Unique indexes are checked after
 * the CHECK rules, so those requests have to pass every CHECK rule, and
 * only the index stops them. If one of those tests fails because a
 * request was saved, run `npm run db:seed`: it deletes the seed renters'
 * other requests.
 *
 * Run with: npm run test:db   (CI runs it; by hand it needs .env.local,
 * the seed data, and migration 0017 on the shared project)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  ADMIN_EMAIL,
  LANDLORD_A_EMAIL,
  LANDLORD_B_EMAIL,
  RENTER_B_EMAIL,
  RENTER_EMAIL,
  VIEWING_REQUEST_IDS,
  newClient,
  signedInAs,
  type SeedUser,
} from "./db-helpers";

const TABLE = "viewing_requests";
const ids = VIEWING_REQUEST_IDS;

// Seed listings (supabase/seed.sql, section 4).
/** landlord1's Santos Boarding House near USC Talamban: available. */
const SANTOS_BOARDING_HOUSE = "a1b2c3d4-0000-4000-8000-000000000001";
/** landlord1's IT Park Studio Rooms: fully occupied. */
const IT_PARK_STUDIO_ROOMS = "a1b2c3d4-0000-4000-8000-000000000003";

/**
 * Today on the Philippine clock, plus `days`, as YYYY-MM-DD: the dates
 * 0017 compares slots with. The Philippines is UTC+8 all year, with no
 * daylight saving.
 */
function manilaDate(days: number): string {
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * A request from `renterId` that passes every rule: landlord1's Santos
 * Boarding House, 30 days ahead at 16:00, a slot no seed request uses.
 * Each test changes one thing about it, and every test but the 23505
 * ones adds UNSAVEABLE. Never insert it unchanged, or it would really be
 * saved.
 */
function requestFrom(renterId: string) {
  return {
    listing_id: SANTOS_BOARDING_HOUSE,
    renter_id: renterId,
    viewing_date: manilaDate(30),
    start_time: "16:00",
    end_time: "17:00",
    attendees: 1,
    message: "RLS test",
  };
}

/**
 * No attendees, which 0017's attendees_in_range CHECK refuses (23514): a
 * request carrying it can never be saved.
 */
const UNSAVEABLE = { attendees: 0 };

/**
 * A decline reason, which 0017's decline_reason_only_when_declined CHECK
 * refuses on any status but declined (23514).
 */
const STRAY_REASON = { decline_reason: "RLS test" };

/**
 * A decline reason one character over 0017's limit of 500, which the
 * same CHECK refuses even on a declined request (23514).
 */
const TOO_LONG_REASON = { decline_reason: "x".repeat(501) };

/**
 * Tries to insert `row` as `client` and returns the error (null if it was
 * saved). A plain insert, without .select(): returning the new row would
 * also run the SELECT policy, which could block an insert that the INSERT
 * policy wrongly allowed, and hide that bug.
 */
async function request(client: SupabaseClient, row: Record<string, unknown>) {
  const { error } = await client.from(TABLE).insert(row);
  return error;
}

/** Updates request `id` as `client`, returning the rows it changed. */
async function update(
  client: SupabaseClient,
  id: string,
  changes: Record<string, unknown>,
) {
  return client.from(TABLE).update(changes).eq("id", id).select("id");
}

let renterA: SeedUser; // renter1
let renterB: SeedUser; // renter2
let landlordA: SeedUser; // landlord1
let landlordB: SeedUser; // landlord2
let admin: SeedUser;

// One sign-in per account for the whole file: the shared project limits
// how many sign-ins it takes in five minutes (AGENTS.md, test:db).
beforeAll(async () => {
  [renterA, renterB, landlordA, landlordB, admin] = await Promise.all([
    signedInAs(RENTER_EMAIL),
    signedInAs(RENTER_B_EMAIL),
    signedInAs(LANDLORD_A_EMAIL),
    signedInAs(LANDLORD_B_EMAIL),
    signedInAs(ADMIN_EMAIL),
  ]);
});

describe("viewing_requests: the seed requests", () => {
  it("are in place, as the other tests expect (if not, run npm run db:seed)", async () => {
    const [{ data: landlordARows }, { data: landlordBRows }] =
      await Promise.all([
        landlordA.client
          .from(TABLE)
          .select("id, status, viewing_date")
          .in("id", Object.values(ids)),
        landlordB.client
          .from(TABLE)
          .select("id, status, viewing_date")
          .in("id", Object.values(ids)),
      ]);
    const rows = [...(landlordARows ?? []), ...(landlordBRows ?? [])];
    const statuses = Object.fromEntries(
      rows.map((row) => [row.id, row.status]),
    );
    const dates = Object.fromEntries(
      rows.map((row) => [row.id, row.viewing_date]),
    );

    expect(statuses).toEqual({
      [ids.pending]: "pending",
      [ids.confirmedYesterday]: "confirmed",
      [ids.completed]: "completed",
      [ids.declined]: "declined",
      [ids.cancelled]: "cancelled",
      [ids.landlordBPending]: "pending",
      [ids.confirmedSoon]: "confirmed",
    });
    // The time-based tests below need one confirmed viewing in the past
    // and one still ahead.
    expect(dates[ids.confirmedYesterday] < manilaDate(0)).toBe(true);
    expect(dates[ids.confirmedSoon] > manilaDate(0)).toBe(true);
  });
});

describe("viewing_requests: requesting a viewing", () => {
  it("RLS lets a renter request a viewing for themselves", async () => {
    const error = await request(renterA.client, {
      ...requestFrom(renterA.userId),
      ...UNSAVEABLE,
    });
    // The CHECK rule stopped it (23514), not RLS (42501).
    expect(error?.code).toBe("23514");
    expect(error?.message).toContain("attendees_in_range");
  });

  it("a renter cannot request a viewing for another renter", async () => {
    const error = await request(renterA.client, {
      ...requestFrom(renterB.userId),
      ...UNSAVEABLE,
    });
    expect(error?.code).toBe("42501");
  });

  it("landlords and the admin cannot request a viewing", async () => {
    for (const user of [landlordA, landlordB, admin]) {
      const error = await request(user.client, {
        ...requestFrom(user.userId),
        ...UNSAVEABLE,
      });
      expect(error?.code).toBe("42501");
    }
  });

  it("a request starts as pending, with no decline reason", async () => {
    for (const status of ["confirmed", "declined", "cancelled", "completed"]) {
      const error = await request(renterA.client, {
        ...requestFrom(renterA.userId),
        ...UNSAVEABLE,
        status,
      });
      expect(error?.code).toBe("42501");
    }

    const withReason = await request(renterA.client, {
      ...requestFrom(renterA.userId),
      ...UNSAVEABLE,
      ...STRAY_REASON,
    });
    expect(withReason?.code).toBe("42501");
  });

  it("a renter cannot request a slot that has already started", async () => {
    const error = await request(renterA.client, {
      ...requestFrom(renterA.userId),
      ...UNSAVEABLE,
      viewing_date: manilaDate(-1),
    });
    expect(error?.code).toBe("42501");
  });

  it("a renter cannot request a viewing of a fully occupied listing", async () => {
    const error = await request(renterA.client, {
      ...requestFrom(renterA.userId),
      ...UNSAVEABLE,
      listing_id: IT_PARK_STUDIO_ROOMS,
    });
    expect(error?.code).toBe("42501");
  });

  it("anonymous visitors cannot request or read viewing requests", async () => {
    const anon = newClient();

    // anon has no grants on this table at all (0017), so both are
    // permission errors rather than empty results.
    const writeError = await request(anon, {
      ...requestFrom(renterA.userId),
      ...UNSAVEABLE,
    });
    expect(writeError?.code).toBe("42501");

    const { error: readError } = await anon.from(TABLE).select("id");
    expect(readError?.code).toBe("42501");
  });
});

describe("viewing_requests: the slot lock and one request per listing", () => {
  it("a pending request holds the landlord's slot, whatever landlord_id the app sends", async () => {
    // The slot of the seed's pending request: renter2 on landlord1's
    // Santos Boarding House.
    const { data: held, error: readError } = await landlordA.client
      .from(TABLE)
      .select("viewing_date, start_time, end_time")
      .eq("id", ids.pending)
      .single();
    expect(readError).toBeNull();

    // renter1 asks for the same slot on the same listing, claiming it's
    // landlord2's. 0017's trigger replaces that with landlord1, the
    // listing's landlord, so landlord1's slot lock stops it. Had the
    // trigger kept landlord2, nothing would stop it (landlord2 has no
    // request at that time) and it would be saved: see the header.
    const error = await request(renterA.client, {
      ...requestFrom(renterA.userId),
      landlord_id: landlordB.userId,
      viewing_date: held?.viewing_date,
      start_time: held?.start_time,
      end_time: held?.end_time,
    });
    expect(error?.code).toBe("23505");
    expect(error?.message).toContain(
      "viewing_requests_one_active_request_per_slot",
    );
  });

  it("a renter can have only one pending or confirmed request per listing", async () => {
    // renter2 already has the seed's pending request for Santos Boarding
    // House. This asks for another one there, at a free slot.
    const error = await request(renterB.client, requestFrom(renterB.userId));
    expect(error?.code).toBe("23505");
    expect(error?.message).toContain(
      "viewing_requests_one_active_request_per_listing",
    );
  });
});

describe("viewing_requests: reading", () => {
  it("a renter reads only their own requests", async () => {
    const { data, error } = await renterA.client
      .from(TABLE)
      .select("id, renter_id");
    expect(error).toBeNull();
    expect(data?.every((row) => row.renter_id === renterA.userId)).toBe(true);

    const seen = data?.map((row) => row.id);
    expect(seen).toEqual(
      expect.arrayContaining([
        ids.confirmedYesterday,
        ids.completed,
        ids.cancelled,
        ids.landlordBPending,
      ]),
    );
    // renter2's requests.
    expect(seen).not.toContain(ids.pending);
    expect(seen).not.toContain(ids.declined);
    expect(seen).not.toContain(ids.confirmedSoon);
  });

  it("a landlord reads only the requests on their own listings", async () => {
    const { data: aRows, error: aError } = await landlordA.client
      .from(TABLE)
      .select("id, landlord_id");
    expect(aError).toBeNull();
    expect(aRows?.every((row) => row.landlord_id === landlordA.userId)).toBe(
      true,
    );
    const seenByA = aRows?.map((row) => row.id);
    expect(seenByA).toEqual(
      expect.arrayContaining([
        ids.pending,
        ids.confirmedYesterday,
        ids.completed,
        ids.declined,
        ids.cancelled,
      ]),
    );
    expect(seenByA).not.toContain(ids.landlordBPending);
    expect(seenByA).not.toContain(ids.confirmedSoon);

    const { data: bRows, error: bError } = await landlordB.client
      .from(TABLE)
      .select("id, landlord_id");
    expect(bError).toBeNull();
    expect(bRows?.every((row) => row.landlord_id === landlordB.userId)).toBe(
      true,
    );
    const seenByB = bRows?.map((row) => row.id);
    expect(seenByB).toEqual(
      expect.arrayContaining([ids.landlordBPending, ids.confirmedSoon]),
    );
    expect(seenByB).not.toContain(ids.pending);
  });

  it("the admin reads no viewing requests", async () => {
    const { data, error } = await admin.client.from(TABLE).select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe("viewing_requests: status changes", () => {
  // Allowed changes. Each one carries a value that breaks a CHECK rule,
  // so a 23514 proves RLS and 0017's trigger let it through, and nothing
  // is saved.

  it("a landlord can confirm or decline a pending request", async () => {
    const confirm = await update(landlordA.client, ids.pending, {
      status: "confirmed",
      ...STRAY_REASON,
    });
    expect(confirm.error?.code).toBe("23514");
    expect(confirm.error?.message).toContain(
      "decline_reason_only_when_declined",
    );

    const decline = await update(landlordA.client, ids.pending, {
      status: "declined",
      ...TOO_LONG_REASON,
    });
    expect(decline.error?.code).toBe("23514");
  });

  it("a landlord can mark a confirmed viewing completed once it has started", async () => {
    const { error } = await update(landlordA.client, ids.confirmedYesterday, {
      status: "completed",
      ...STRAY_REASON,
    });
    expect(error?.code).toBe("23514");
  });

  it("a renter can cancel a pending or confirmed request before it starts", async () => {
    const pending = await update(renterB.client, ids.pending, {
      status: "cancelled",
      ...STRAY_REASON,
    });
    expect(pending.error?.code).toBe("23514");

    const confirmed = await update(renterB.client, ids.confirmedSoon, {
      status: "cancelled",
      ...STRAY_REASON,
    });
    expect(confirmed.error?.code).toBe("23514");
  });

  // Refused changes: 0017's trigger answers 42501.

  it("a landlord cannot complete a viewing that hasn't started, or isn't confirmed", async () => {
    const early = await update(landlordB.client, ids.confirmedSoon, {
      status: "completed",
      ...STRAY_REASON,
    });
    expect(early.error?.code).toBe("42501");

    const pending = await update(landlordA.client, ids.pending, {
      status: "completed",
      ...STRAY_REASON,
    });
    expect(pending.error?.code).toBe("42501");
  });

  it("a landlord cannot cancel a request", async () => {
    const { error } = await update(landlordA.client, ids.pending, {
      status: "cancelled",
      ...STRAY_REASON,
    });
    expect(error?.code).toBe("42501");
  });

  it("a renter cannot confirm, decline or complete a request", async () => {
    for (const status of ["confirmed", "declined"]) {
      const { error } = await update(renterB.client, ids.pending, {
        status,
        ...TOO_LONG_REASON,
      });
      expect(error?.code).toBe("42501");
    }

    const complete = await update(renterA.client, ids.confirmedYesterday, {
      status: "completed",
      ...STRAY_REASON,
    });
    expect(complete.error?.code).toBe("42501");
  });

  it("a renter cannot cancel once the viewing has started", async () => {
    const { error } = await update(renterA.client, ids.confirmedYesterday, {
      status: "cancelled",
      ...STRAY_REASON,
    });
    expect(error?.code).toBe("42501");
  });

  it("declined, cancelled and completed requests are final", async () => {
    const reopenDeclined = await update(landlordA.client, ids.declined, {
      status: "confirmed",
      ...STRAY_REASON,
    });
    expect(reopenDeclined.error?.code).toBe("42501");

    // Keeping the status counts as a change too, so a decline reason
    // can't be rewritten afterwards.
    const rewriteReason = await update(
      landlordA.client,
      ids.declined,
      TOO_LONG_REASON,
    );
    expect(rewriteReason.error?.code).toBe("42501");

    const reopenCompleted = await update(landlordA.client, ids.completed, {
      status: "confirmed",
      ...STRAY_REASON,
    });
    expect(reopenCompleted.error?.code).toBe("42501");

    const reopenCancelled = await update(renterA.client, ids.cancelled, {
      status: "pending",
      ...STRAY_REASON,
    });
    expect(reopenCancelled.error?.code).toBe("42501");
  });

  it("nobody can change someone else's request", async () => {
    // RLS hides the row, so the update matches nothing: no error, no row.
    for (const user of [landlordB, renterA, admin]) {
      const { data, error } = await update(user.client, ids.pending, {
        status: "cancelled",
        ...STRAY_REASON,
      });
      expect(error).toBeNull();
      expect(data).toEqual([]);
    }
  });

  it("only the status and the decline reason can change", async () => {
    // 0017's column grants refuse any other column before the trigger
    // even runs: "permission denied".
    const date = await update(landlordA.client, ids.pending, {
      viewing_date: manilaDate(10),
    });
    expect(date.error?.code).toBe("42501");
    expect(date.error?.message).toContain("permission denied");

    const attendees = await update(renterB.client, ids.pending, UNSAVEABLE);
    expect(attendees.error?.code).toBe("42501");
    expect(attendees.error?.message).toContain("permission denied");

    const landlord = await update(landlordA.client, ids.pending, {
      landlord_id: landlordB.userId,
    });
    expect(landlord.error?.code).toBe("42501");
    expect(landlord.error?.message).toContain("permission denied");
  });

  it("nobody can delete a request", async () => {
    // No delete grant at all (0017): 42501, and the request stays.
    const renterDelete = await renterA.client
      .from(TABLE)
      .delete()
      .eq("id", ids.cancelled);
    expect(renterDelete.error?.code).toBe("42501");

    const landlordDelete = await landlordA.client
      .from(TABLE)
      .delete()
      .eq("id", ids.pending);
    expect(landlordDelete.error?.code).toBe("42501");
  });

  it("anonymous visitors cannot change a request", async () => {
    const { error } = await update(newClient(), ids.pending, {
      status: "cancelled",
      ...STRAY_REASON,
    });
    expect(error?.code).toBe("42501");
  });
});
