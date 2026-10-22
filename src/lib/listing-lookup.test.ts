import { describe, expect, it } from "vitest";
import {
  INVALID_UUID_ERROR_CODE,
  lookupListing,
  MISSING_LISTING_NOTICE,
  MISSING_LISTING_REDIRECT_PATH,
} from "./listing-lookup";

const listing = { id: "a1b2c3d4-0000-0000-0000-000000000001", title: "Room" };

describe("lookupListing", () => {
  it("finds the listing when the query returns a row", () => {
    expect(lookupListing({ data: listing, error: null })).toEqual({
      kind: "found",
      listing,
    });
  });

  it("calls it missing when the query returns no row", () => {
    // Deleted, or another landlord's (RLS and the landlord_id filter hide it)
    expect(lookupListing({ data: null, error: null })).toEqual({
      kind: "missing",
    });
  });

  it("calls it missing when the id in the URL isn't a UUID", () => {
    const error = {
      code: INVALID_UUID_ERROR_CODE,
      message: 'invalid input syntax for type uuid: "not-a-uuid"',
    };
    expect(lookupListing({ data: null, error })).toEqual({ kind: "missing" });
  });

  it("calls any other error a failure, not missing", () => {
    const error = { code: "", message: "TypeError: fetch failed" };
    expect(lookupListing({ data: null, error })).toEqual({
      kind: "failed",
      error,
    });
  });

  it("calls a permission error a failure too", () => {
    const error = {
      code: "42501",
      message: "permission denied for table listings",
    };
    expect(lookupListing({ data: null, error }).kind).toBe("failed");
  });
});

describe("MISSING_LISTING_REDIRECT_PATH", () => {
  it("goes to My Posted Listings with the missing-listing note", () => {
    const url = new URL(MISSING_LISTING_REDIRECT_PATH, "http://localhost");
    expect(url.pathname).toBe("/dashboard/landlord/listings");
    expect(url.searchParams.get("notice")).toBe(MISSING_LISTING_NOTICE);
  });
});
