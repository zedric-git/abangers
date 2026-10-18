import { describe, expect, it } from "vitest";
import {
  decideCanCreateListings,
  isFixedOnProfilePage,
  isProfileComplete,
  type CannotCreateListingsReason,
  type ListingProfile,
} from "./can-create-listings";

// A profiles row as Supabase returns it: null for the unused links.
const completeLandlord: ListingProfile = {
  role: "landlord",
  full_name: "Maria Santos",
  contact_number: "09171234567",
  facebook_url: "facebook.com/maria",
  instagram_url: null,
  x_url: null,
};

describe("isProfileComplete", () => {
  it("accepts a complete profiles row", () => {
    expect(isProfileComplete(completeLandlord)).toBe(true);
  });

  it("treats empty (null) columns as missing", () => {
    expect(isProfileComplete({ ...completeLandlord, full_name: null })).toBe(
      false,
    );
    expect(
      isProfileComplete({ ...completeLandlord, contact_number: null }),
    ).toBe(false);
    expect(isProfileComplete({ ...completeLandlord, facebook_url: null })).toBe(
      false,
    );
  });
});

describe("decideCanCreateListings", () => {
  it("allows a landlord with a complete profile and an approved verification", () => {
    expect(decideCanCreateListings(completeLandlord, ["approved"])).toEqual({
      ok: true,
    });
  });

  it("allows them when an earlier submission was rejected", () => {
    expect(
      decideCanCreateListings(completeLandlord, ["rejected", "approved"]),
    ).toEqual({ ok: true });
  });

  it("turns down renters, whatever their profile says", () => {
    expect(
      decideCanCreateListings({ ...completeLandlord, role: "renter" }, [
        "approved",
      ]),
    ).toMatchObject({ ok: false, reason: "not_landlord" });
  });

  it("sends a user with no profiles row to complete their profile", () => {
    expect(decideCanCreateListings(null, [])).toMatchObject({
      ok: false,
      reason: "profile_incomplete",
    });
  });

  it("asks for a complete profile first, even when verified", () => {
    const incomplete = { ...completeLandlord, contact_number: "0917123456" };
    expect(decideCanCreateListings(incomplete, ["approved"])).toMatchObject({
      ok: false,
      reason: "profile_incomplete",
    });
    expect(decideCanCreateListings(incomplete, [])).toMatchObject({
      ok: false,
      reason: "profile_incomplete",
    });
  });

  it("explains a verification that's still pending", () => {
    expect(
      decideCanCreateListings(completeLandlord, ["rejected", "pending"]),
    ).toMatchObject({ ok: false, reason: "verification_pending" });
  });

  it("explains a rejected verification", () => {
    expect(
      decideCanCreateListings(completeLandlord, ["rejected", "rejected"]),
    ).toMatchObject({ ok: false, reason: "verification_rejected" });
  });

  it("asks a landlord who never submitted one to verify", () => {
    expect(decideCanCreateListings(completeLandlord, [])).toMatchObject({
      ok: false,
      reason: "not_verified",
    });
  });

  it("gives every reason its own message", () => {
    const cases: [ListingProfile | null, string[]][] = [
      [{ ...completeLandlord, role: "renter" }, []],
      [null, []],
      [completeLandlord, ["pending"]],
      [completeLandlord, ["rejected"]],
      [completeLandlord, []],
    ];
    const messages = cases.map(([profile, statuses]) => {
      const result = decideCanCreateListings(profile, statuses);
      return result.ok ? "" : result.message;
    });
    expect(new Set(messages).size).toBe(messages.length);
    messages.forEach((message) => expect(message).not.toBe(""));
  });
});

describe("isFixedOnProfilePage", () => {
  // true = the message sends the landlord to their Profile page, so the
  // listing form's error card links there (#221).
  it.each([
    ["profile_incomplete", true],
    ["not_verified", true],
    ["verification_rejected", true],
    ["verification_pending", false],
    ["not_landlord", false],
    ["check_failed", false],
  ] satisfies [CannotCreateListingsReason, boolean][])(
    "%s → %s",
    (reason, expected) => {
      expect(isFixedOnProfilePage(reason)).toBe(expected);
    },
  );
});
