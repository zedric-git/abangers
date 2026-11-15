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
      features: undefined,
      rules: undefined,
    });
  });

  it("trims search query and parses valid numbers and attributes", () => {
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
      features: undefined,
      rules: undefined,
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

  it("parses and canonicalizes features from comma-separated string", () => {
    const result = listingFilterParamsSchema.parse({
      features: "WiFi,aircon,Private CR",
    });
    expect(result.features).toEqual([
      "Wi-Fi Included",
      "Air Conditioning",
      "Private Bathroom/CR",
    ]);
  });

  it("parses and validates house rules, discarding invalid ones", () => {
    const result = listingFilterParamsSchema.parse({
      rules: "No Curfew,Cooking Allowed,Play Loud Drums",
    });
    expect(result.rules).toEqual(["No Curfew", "Cooking Allowed"]);
  });
});

describe("parseListingFilterParams", () => {
  it("handles null or non-object gracefully", () => {
    expect(parseListingFilterParams(null)).toEqual({ q: "" });
    expect(parseListingFilterParams(undefined)).toEqual({ q: "" });
    expect(parseListingFilterParams("invalid")).toEqual({ q: "" });
  });

  it("handles URLSearchParams instances with core, feature, and rule filters", () => {
    const params = new URLSearchParams(
      "q=Banilad&max_rent=6000&property_type=Boarding+House&occupancy=Bedspace&gender=Male+Only&features=WiFi,CCTV&rules=Pets+Allowed",
    );
    const parsed = parseListingFilterParams(params);
    expect(parsed).toEqual({
      q: "Banilad",
      max_rent: 6000,
      property_type: "Boarding House",
      occupancy: "Bedspace",
      gender: "Male Only",
      features: ["Wi-Fi Included", "CCTV"],
      rules: ["Pets Allowed"],
    });
  });

  it("handles Next.js array values in query params", () => {
    const parsed = parseListingFilterParams({
      q: ["Lahug"],
      max_rent: ["8000"],
      property_type: ["Condo"],
      features: ["Wi-Fi Included", "Has Parking"],
      rules: ["No Curfew"],
    });
    expect(parsed.q).toBe("Lahug");
    expect(parsed.max_rent).toBe(8000);
    expect(parsed.property_type).toBe("Condo");
    expect(parsed.features).toEqual(["Wi-Fi Included", "Has Parking"]);
    expect(parsed.rules).toEqual(["No Curfew"]);
  });
});

describe("parseListingFilterParams: the radius search (S2-10)", () => {
  const parse = (query: string) =>
    parseListingFilterParams(new URLSearchParams(query));

  it("keeps a valid point, its radius and the place's name", () => {
    expect(
      parse("lat=10.35300&lng=123.91250&radius_km=0.5&near=USC+Talamban"),
    ).toMatchObject({
      lat: 10.353,
      lng: 123.9125,
      radius_km: 0.5,
      near: "USC Talamban",
    });
  });

  it("keeps a point picked on the map, which has no name", () => {
    const parsed = parse("lat=10.32290&lng=123.89900&radius_km=1");
    expect(parsed).toMatchObject({ lat: 10.3229, lng: 123.899, radius_km: 1 });
    expect(parsed.near).toBeUndefined();
  });

  it("drops half a point, a broken one or one off the map, with its name", () => {
    for (const query of [
      "lat=10.35&near=USC",
      "lng=123.91&near=USC",
      "lat=abc&lng=123.91&near=USC",
      "lat=10.35&lng=&near=USC",
      "lat=95&lng=123.91&near=USC",
      "lat=10.35&lng=181&near=USC",
    ]) {
      const parsed = parse(query);
      expect(parsed.lat, query).toBeUndefined();
      expect(parsed.lng, query).toBeUndefined();
      expect(parsed.near, query).toBeUndefined();
    }
  });

  it("ignores a radius other than 0.5, 1 or 5 (the page then starts at 5 km)", () => {
    expect(parse("lat=10.35&lng=123.91&radius_km=3").radius_km).toBeUndefined();
    expect(
      parse("lat=10.35&lng=123.91&radius_km=far").radius_km,
    ).toBeUndefined();
    // An old link from before 500 m / 1 km / 5 km (plan update 2 on #28).
    expect(
      parse("lat=10.35&lng=123.91&radius_km=10").radius_km,
    ).toBeUndefined();
    expect(parse("lat=10.35&lng=123.91&radius_km=5").radius_km).toBe(5);
    expect(parse("lat=10.35&lng=123.91&radius_km=.5").radius_km).toBe(0.5);
  });

  it("trims the place's name and cuts it to 100 characters", () => {
    expect(
      parseListingFilterParams({
        lat: "10.35",
        lng: "123.91",
        near: "  IT Park ",
      }).near,
    ).toBe("IT Park");
    expect(
      parseListingFilterParams({
        lat: "10.35",
        lng: "123.91",
        near: "A".repeat(150),
      }).near,
    ).toBe("A".repeat(100));
    expect(
      parseListingFilterParams({ lat: "10.35", lng: "123.91", near: "   " })
        .near,
    ).toBeUndefined();
  });
});
