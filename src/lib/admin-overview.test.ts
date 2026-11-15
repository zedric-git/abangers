import { describe, expect, it } from "vitest";
import {
  UNKNOWN_COUNT,
  countDistinctLandlords,
  overviewStats,
  type AdminOverview,
} from "./admin-overview";

const seedLike: AdminOverview = {
  renters: 3,
  landlords: 3,
  listingsByStatus: { available: 3, almost_full: 2, fully_occupied: 1 },
  pendingVerifications: 1,
  verifiedLandlords: 1,
};

// The stat cards by key, for reading the tests.
function statsByKey(overview: AdminOverview) {
  return Object.fromEntries(
    overviewStats(overview).map((stat) => [stat.key, stat]),
  );
}

describe("the admin home's stat cards (#309)", () => {
  it("shows the real numbers, in order", () => {
    expect(
      overviewStats(seedLike).map((stat) => [stat.label, stat.value]),
    ).toEqual([
      ["Users", "6"],
      ["Listings", "6"],
      ["Pending Verifications", "1"],
      ["Verified Landlords", "1"],
    ]);
  });

  it("breaks the users and listings down", () => {
    const stats = statsByKey(seedLike);
    expect(stats.users.detail).toBe("3 renters · 3 landlords");
    expect(stats.listings.detail).toBe("3 available · 2 almost full · 1 full");
    expect(stats.verified.detail).toBe(
      "Of 3 landlords: they can post listings",
    );
  });

  it("uses the singular for one", () => {
    const stats = statsByKey({ ...seedLike, renters: 1, landlords: 1 });
    expect(stats.users.detail).toBe("1 renter · 1 landlord");
    expect(stats.verified.detail).toBe("Of 1 landlord: they can post listings");
  });

  it("highlights the pending card only when something is waiting", () => {
    expect(statsByKey(seedLike).pending).toMatchObject({
      highlight: true,
      detail: "Waiting for your review",
    });
    expect(
      statsByKey({ ...seedLike, pendingVerifications: 0 }).pending,
    ).toMatchObject({ highlight: false, detail: "Nothing waiting for review" });
  });

  it("says a number couldn't be read instead of showing 0", () => {
    const stats = statsByKey({
      renters: null,
      landlords: 3,
      listingsByStatus: null,
      pendingVerifications: null,
      verifiedLandlords: null,
    });
    for (const key of ["users", "listings", "pending", "verified"]) {
      expect(stats[key].value, key).toBe(UNKNOWN_COUNT);
      expect(stats[key].detail, key).toMatch(/couldn't load/i);
      expect(stats[key].highlight, key).toBe(false);
    }
  });

  it("still counts the verified landlords when the landlords couldn't be read", () => {
    const stats = statsByKey({ ...seedLike, landlords: null });
    expect(stats.verified).toMatchObject({
      value: "1",
      detail: "Can post listings",
    });
  });
});

describe("countDistinctLandlords", () => {
  it("counts each landlord once", () => {
    expect(
      countDistinctLandlords([
        { landlord_id: "a" },
        { landlord_id: "b" },
        { landlord_id: "a" },
      ]),
    ).toBe(2);
    expect(countDistinctLandlords([])).toBe(0);
  });
});
