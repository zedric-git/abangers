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
      min_rent: undefined,
      max_rent: undefined,
      property_type: undefined,
      occupancy: undefined,
      gender: undefined,
      near: undefined,
      distance: undefined,
      parking: undefined,
      utilities: undefined,
      room_features: undefined,
      bathroom: undefined,
      kitchen: undefined,
      laundry: undefined,
      safety: undefined,
      house_rules: undefined,
    });
  });

  it("trims search query and parses valid numbers and arrays", () => {
    const result = listingFilterParamsSchema.parse({
      q: "  USC Main  ",
      min_rent: "2500",
      max_rent: "4500",
      property_type: "Apartment",
      occupancy: "Single Room",
      gender: "Female Only",
      parking: true,
      utilities: ["Wi-Fi Included"],
      room_features: ["Air Conditioning"],
      house_rules: ["No Curfew"],
    });
    expect(result).toEqual({
      q: "USC Main",
      min_rent: 2500,
      max_rent: 4500,
      property_type: "Apartment",
      occupancy: "Single Room",
      gender: "Female Only",
      near: undefined,
      distance: undefined,
      parking: true,
      utilities: ["Wi-Fi Included"],
      room_features: ["Air Conditioning"],
      bathroom: undefined,
      kitchen: undefined,
      laundry: undefined,
      safety: undefined,
      house_rules: ["No Curfew"],
    });
  });

  it("safely ignores invalid max_rent and min_rent", () => {
    expect(
      listingFilterParamsSchema.parse({ max_rent: "abc" }).max_rent,
    ).toBeUndefined();
    expect(
      listingFilterParamsSchema.parse({ min_rent: "-500" }).min_rent,
    ).toBeUndefined();
    expect(
      listingFilterParamsSchema.parse({ min_rent: "0" }).min_rent,
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

  it("handles URLSearchParams instances with arrays and comma-separated values", () => {
    const params = new URLSearchParams(
      "q=Banilad&min_rent=2500&max_rent=6000&property_type=Boarding+House&occupancy=Bedspace&gender=Male+Only&parking=true&utilities=Wi-Fi+Included%2CWater+Included&house_rules=No+Curfew",
    );
    const parsed = parseListingFilterParams(params);
    expect(parsed).toEqual({
      q: "Banilad",
      min_rent: 2500,
      max_rent: 6000,
      property_type: "Boarding House",
      occupancy: "Bedspace",
      gender: "Male Only",
      near: undefined,
      distance: undefined,
      parking: true,
      utilities: ["Wi-Fi Included", "Water Included"],
      room_features: undefined,
      bathroom: undefined,
      kitchen: undefined,
      laundry: undefined,
      safety: undefined,
      house_rules: ["No Curfew"],
    });
  });

  it("handles Next.js array values in query params", () => {
    const parsed = parseListingFilterParams({
      q: ["Lahug"],
      max_rent: ["8000"],
      property_type: ["Condo"],
      room_features: ["Air Conditioning", "Table/Desk"],
    });
    expect(parsed.q).toBe("Lahug");
    expect(parsed.max_rent).toBe(8000);
    expect(parsed.property_type).toBe("Condo");
    expect(parsed.room_features).toEqual(["Air Conditioning", "Table/Desk"]);
  });
});
