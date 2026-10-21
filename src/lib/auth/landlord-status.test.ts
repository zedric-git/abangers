import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database";
import {
  decideCanCreateListings,
  type ListingProfile,
} from "./can-create-listings";
import {
  decideLandlordStatus,
  loadLandlordStatus,
  type LandlordStatus,
  type VerificationRow,
} from "./landlord-status";

const LANDLORD_ID = "11111111-1111-4111-8111-111111111111";

// A profiles row as Supabase returns it: null for the unused links.
const completeLandlord: ListingProfile = {
  role: "landlord",
  full_name: "Maria Santos",
  contact_number: "09171234567",
  facebook_url: "facebook.com/maria",
  instagram_url: null,
  x_url: null,
};

// No social link, so not complete.
const incompleteLandlord: ListingProfile = {
  ...completeLandlord,
  facebook_url: null,
};

/** A landlord_verifications row, sent on the given day of October 2026. */
function row(
  status: string,
  day: number,
  rejectionReason: string | null = null,
): VerificationRow {
  return {
    status,
    rejection_reason: rejectionReason,
    submitted_at: `2026-10-${String(day).padStart(2, "0")}T08:00:00+00:00`,
  };
}

describe("decideLandlordStatus", () => {
  it("a verified landlord with a complete profile can post", () => {
    expect(
      decideLandlordStatus(completeLandlord, [row("approved", 1)]),
    ).toEqual({
      verification: "verified",
      rejectionReason: null,
      profileComplete: true,
      canCreateListings: true,
      fullName: "Maria Santos",
    } satisfies LandlordStatus);
  });

  it("a landlord who never sent a verification can't post yet", () => {
    expect(decideLandlordStatus(completeLandlord, [])).toMatchObject({
      verification: "not_verified",
      rejectionReason: null,
      profileComplete: true,
      canCreateListings: false,
    });
  });

  it("a landlord whose verification is being reviewed can't post yet", () => {
    expect(
      decideLandlordStatus(completeLandlord, [row("pending", 1)]),
    ).toMatchObject({
      verification: "pending",
      rejectionReason: null,
      canCreateListings: false,
    });
  });

  it("a rejected landlord gets the admin's reason", () => {
    expect(
      decideLandlordStatus(completeLandlord, [
        row("rejected", 1, "The photo of your ID is blurry."),
      ]),
    ).toMatchObject({
      verification: "rejected",
      rejectionReason: "The photo of your ID is blurry.",
      canCreateListings: false,
    });
  });

  it("gives the newest rejection's reason, whatever order the rows come in", () => {
    const older = row("rejected", 1, "The photo of your ID is blurry.");
    const newer = row("rejected", 9, "Your ID has expired.");

    for (const rows of [
      [older, newer],
      [newer, older],
    ]) {
      expect(decideLandlordStatus(completeLandlord, rows).rejectionReason).toBe(
        "Your ID has expired.",
      );
    }
  });

  it("forgets an old rejection once there's a newer submission", () => {
    const rejected = row("rejected", 1, "Your ID has expired.");

    expect(
      decideLandlordStatus(completeLandlord, [rejected, row("pending", 9)]),
    ).toMatchObject({ verification: "pending", rejectionReason: null });
    expect(
      decideLandlordStatus(completeLandlord, [rejected, row("approved", 9)]),
    ).toMatchObject({
      verification: "verified",
      rejectionReason: null,
      canCreateListings: true,
    });
  });

  it("trims the reason, and treats a blank one as none", () => {
    expect(
      decideLandlordStatus(completeLandlord, [
        row("rejected", 1, "  Your ID has expired.  "),
      ]).rejectionReason,
    ).toBe("Your ID has expired.");
    expect(
      decideLandlordStatus(completeLandlord, [row("rejected", 1, "   ")])
        .rejectionReason,
    ).toBeNull();
  });

  it("a verified landlord with an incomplete profile can't post", () => {
    expect(
      decideLandlordStatus(incompleteLandlord, [row("approved", 1)]),
    ).toMatchObject({
      verification: "verified",
      profileComplete: false,
      canCreateListings: false,
    });
  });

  it("a user with no profiles row has an incomplete profile and no name", () => {
    expect(decideLandlordStatus(null, [])).toEqual({
      verification: "not_verified",
      rejectionReason: null,
      profileComplete: false,
      canCreateListings: false,
      fullName: null,
    } satisfies LandlordStatus);
  });

  it("trims the name, and treats a blank one as none", () => {
    expect(
      decideLandlordStatus({ ...completeLandlord, full_name: " Jun " }, [])
        .fullName,
    ).toBe("Jun");
    expect(
      decideLandlordStatus({ ...completeLandlord, full_name: "  " }, [])
        .fullName,
    ).toBeNull();
  });

  it("always agrees with createListingAction's check on who can post", () => {
    const profiles = [
      completeLandlord,
      incompleteLandlord,
      { ...completeLandlord, role: "renter" },
      null,
    ];
    const submissions = [
      [],
      [row("pending", 1)],
      [row("rejected", 1, "Blurry.")],
      [row("approved", 1)],
      [row("rejected", 1, "Blurry."), row("approved", 2)],
    ];

    for (const profile of profiles) {
      for (const rows of submissions) {
        const statuses = rows.map((r) => r.status);
        expect(
          decideLandlordStatus(profile, rows).canCreateListings,
          JSON.stringify({ profile, statuses }),
        ).toBe(decideCanCreateListings(profile, statuses).ok);
      }
    }
  });
});

/** How the fake client should answer. */
type FakeSetup = {
  /** The profiles row (null = none). */
  profile?: ListingProfile | null;
  /** The landlord_verifications rows. */
  rows?: VerificationRow[];
  /** Which read fails, e.g. no connection. */
  failing?: "profiles" | "landlord_verifications";
};

/**
 * A stand-in for the Supabase client, with just the two reads
 * loadLandlordStatus makes. It records what each read asked for in
 * `reads`, so a test can check the table, the columns and the filter.
 */
function fakeSupabase(setup: FakeSetup = {}) {
  const { profile = completeLandlord, rows = [], failing } = setup;
  const reads: { table: string; columns: string; filter: string }[] = [];

  const client = {
    from(table: string) {
      return {
        select(columns: string) {
          return {
            eq(column: string, value: string) {
              reads.push({ table, columns, filter: `${column} = ${value}` });
              const error =
                failing === table ? { message: "network error" } : null;
              if (table === "profiles") {
                return {
                  maybeSingle: async () => ({
                    data: error ? null : profile,
                    error,
                  }),
                };
              }
              return Promise.resolve({ data: error ? null : rows, error });
            },
          };
        },
      };
    },
  };

  return { supabase: client as unknown as SupabaseClient<Database>, reads };
}

describe("loadLandlordStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the landlord's own profile and submissions, then decides", async () => {
    const rows = [row("rejected", 3, "Your ID has expired.")];
    const { supabase, reads } = fakeSupabase({ rows });

    const status = await loadLandlordStatus(supabase, LANDLORD_ID);

    expect(status).toEqual(decideLandlordStatus(completeLandlord, rows));
    expect(reads).toEqual([
      {
        table: "profiles",
        columns:
          "role, full_name, contact_number, facebook_url, instagram_url, x_url",
        filter: `id = ${LANDLORD_ID}`,
      },
      {
        table: "landlord_verifications",
        columns: "status, rejection_reason, submitted_at",
        filter: `landlord_id = ${LANDLORD_ID}`,
      },
    ]);
  });

  it.each(["profiles", "landlord_verifications"] as const)(
    "gives null when reading %s fails",
    async (failing) => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const { supabase } = fakeSupabase({ failing });

      expect(await loadLandlordStatus(supabase, LANDLORD_ID)).toBeNull();
      expect(consoleError).toHaveBeenCalledOnce();
    },
  );
});
