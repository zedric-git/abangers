import { describe, expect, it } from "vitest";
import {
  listingFilterParamsSchema,
  parseListingFilterParams,
} from "./listing-filters";

describe("listingFilterParamsSchema", () => {
  it("defaults empty input to empty search query and undefined filters", () => {
    const result = listingFilterParamsSchema.parse({});
    expect(result).toEqual({
      q: "",
      max_rent: undefined,
      property_type: undefined,
      occupancy: undefined,
      gender: undefined,
    });
  });

  it("trims search query and parses valid numbers", () => {
    const result = listingFilterParamsSchema.parse({
      q: "  USC Main  ",
      max_rent: "4500",
      property_type: "Apartment",
      occupancy: "Single Room",
      gender: "Female Only",
    });
    expect(result).toEqual({
      q: "USC Main",
      max_rent: 4500,
      property_type: "Apartment",
      occupancy: "Single Room",
      gender: "Female Only",
    });
  });

  it("safely ignores invalid max_rent (e.g. text or non-positive numbers)", () => {
    expect(
      listingFilterParamsSchema.parse({ max_rent: "abc" }).max_rent,
    ).toBeUndefined();
    expect(
      listingFilterParamsSchema.parse({ max_rent: "-500" }).max_rent,
    ).toBeUndefined();
    expect(
      listingFilterParamsSchema.parse({ max_rent: "0" }).max_rent,
    ).toBeUndefined();
  });

  it("safely ignores unrecognized enum values", () => {
    const result = listingFilterParamsSchema.parse({
      property_type: "Castle",
      occupancy: "Penthouse",
      gender: "Aliens",
    });
    expect(result.property_type).toBeUndefined();
    expect(result.occupancy).toBeUndefined();
    expect(result.gender).toBeUndefined();
  });
});

describe("parseListingFilterParams", () => {
  it("handles null or non-object gracefully", () => {
    expect(parseListingFilterParams(null)).toEqual({ q: "" });
    expect(parseListingFilterParams(undefined)).toEqual({ q: "" });
    expect(parseListingFilterParams("invalid")).toEqual({ q: "" });
  });

  it("handles URLSearchParams instances", () => {
    const params = new URLSearchParams(
      "q=Banilad&max_rent=6000&property_type=Boarding+House&occupancy=Bedspace&gender=Male+Only",
    );
    const parsed = parseListingFilterParams(params);
    expect(parsed).toEqual({
      q: "Banilad",
      max_rent: 6000,
      property_type: "Boarding House",
      occupancy: "Bedspace",
      gender: "Male Only",
    });
  });

  it("handles Next.js array values in query params", () => {
    const parsed = parseListingFilterParams({
      q: ["Lahug"],
      max_rent: ["8000"],
      property_type: ["Condo"],
    });
    expect(parsed.q).toBe("Lahug");
    expect(parsed.max_rent).toBe(8000);
    expect(parsed.property_type).toBe("Condo");
  });
});
