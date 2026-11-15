import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEARCH_RADIUS_KM,
  LARGEST_SEARCH_RADIUS_KM,
  SEARCH_RADII_KM,
  distanceKm,
  formatDistance,
  formatRadius,
  isSearchRadiusKm,
  listingCoordinates,
  listingsWithinRadius,
} from "./geo";

// Three seed listings' pins (supabase/seed.sql), so the numbers below are
// ones you can check on the map.
const TALAMBAN = { lat: 10.353, lng: 123.9125 }; // Maria Santos, Nasipit Rd
const SANCIANGKO = { lat: 10.2978, lng: 123.8978 }; // Jun Dela Cruz, Sanciangko St
const DEL_ROSARIO = { lat: 10.2936, lng: 123.8997 }; // Jun Dela Cruz, P. Del Rosario St

const listing = (id: string, point: { lat: number; lng: number } | null) => ({
  id,
  latitude: point?.lat ?? null,
  longitude: point?.lng ?? null,
});

const ids = (results: { listing: { id: string } }[]) =>
  results.map((result) => result.listing.id);

describe("search radii", () => {
  it("offers 500 m, 1 km and 5 km, starting at the largest", () => {
    expect(SEARCH_RADII_KM).toEqual([0.5, 1, 5]);
    expect(DEFAULT_SEARCH_RADIUS_KM).toBe(5);
    expect(LARGEST_SEARCH_RADIUS_KM).toBe(5);
  });

  it("accepts only those three numbers", () => {
    expect(isSearchRadiusKm(0.5)).toBe(true);
    expect(isSearchRadiusKm(1)).toBe(true);
    expect(isSearchRadiusKm(5)).toBe(true);
    // 10 km was a choice before plan update 2 on #28.
    expect(isSearchRadiusKm(10)).toBe(false);
    expect(isSearchRadiusKm(2)).toBe(false);
    expect(isSearchRadiusKm(0)).toBe(false);
    expect(isSearchRadiusKm("5")).toBe(false);
    expect(isSearchRadiusKm(Number.NaN)).toBe(false);
  });

  it("labels each radius the way the controls show it", () => {
    expect(SEARCH_RADII_KM.map(formatRadius)).toEqual([
      "500 m",
      "1 km",
      "5 km",
    ]);
  });
});

describe("distanceKm", () => {
  it("is 0 from a point to itself", () => {
    expect(distanceKm(TALAMBAN, TALAMBAN)).toBe(0);
  });

  it("measures one degree of latitude as about 111.2 km", () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(
      111.195,
      2,
    );
  });

  it("gives the same distance both ways", () => {
    expect(distanceKm(TALAMBAN, SANCIANGKO)).toBeCloseTo(
      distanceKm(SANCIANGKO, TALAMBAN),
      10,
    );
  });

  it("matches the distances between the seed listings", () => {
    expect(distanceKm(TALAMBAN, SANCIANGKO)).toBeCloseTo(6.35, 1);
    expect(distanceKm(TALAMBAN, DEL_ROSARIO)).toBeCloseTo(6.75, 1);
    expect(distanceKm(SANCIANGKO, DEL_ROSARIO)).toBeCloseTo(0.51, 1);
  });
});

describe("listingCoordinates", () => {
  it("returns a listing's pin", () => {
    expect(
      listingCoordinates({ latitude: 10.353, longitude: 123.9125 }),
    ).toEqual({ lat: 10.353, lng: 123.9125 });
  });

  it("returns null when the listing has no usable pin", () => {
    expect(listingCoordinates({})).toBeNull();
    expect(listingCoordinates({ latitude: null, longitude: null })).toBeNull();
    expect(listingCoordinates({ latitude: 10.35, longitude: null })).toBeNull();
    expect(
      listingCoordinates({ latitude: Number.NaN, longitude: 123.9 }),
    ).toBeNull();
    expect(
      listingCoordinates({ latitude: 10.35, longitude: Infinity }),
    ).toBeNull();
    expect(listingCoordinates({ latitude: 95, longitude: 123.9 })).toBeNull();
    expect(listingCoordinates({ latitude: 10.35, longitude: 200 })).toBeNull();
  });
});

describe("listingsWithinRadius", () => {
  const listings = [
    listing("talamban", TALAMBAN),
    listing("sanciangko", SANCIANGKO),
    listing("del-rosario", DEL_ROSARIO),
    listing("no-pin", null),
  ];

  it("keeps only the listings inside the radius, nearest first", () => {
    expect(ids(listingsWithinRadius(listings, DEL_ROSARIO, 1))).toEqual([
      "del-rosario",
      "sanciangko",
    ]);
  });

  it("takes in more listings as the radius grows", () => {
    expect(ids(listingsWithinRadius(listings, TALAMBAN, 1))).toEqual([
      "talamban",
    ]);
    expect(ids(listingsWithinRadius(listings, TALAMBAN, 5))).toEqual([
      "talamban",
    ]);
    expect(ids(listingsWithinRadius(listings, TALAMBAN, 10))).toEqual([
      "talamban",
      "sanciangko",
      "del-rosario",
    ]);
  });

  it("counts a listing exactly on the edge as inside", () => {
    const edge = distanceKm(TALAMBAN, SANCIANGKO);
    expect(ids(listingsWithinRadius(listings, TALAMBAN, edge))).toEqual([
      "talamban",
      "sanciangko",
    ]);
  });

  it("leaves out listings without a pin", () => {
    expect(ids(listingsWithinRadius(listings, TALAMBAN, 20_000))).not.toContain(
      "no-pin",
    );
  });

  it("returns each listing's distance", () => {
    const [nearest, next] = listingsWithinRadius(listings, SANCIANGKO, 1);
    expect(nearest.listing.id).toBe("sanciangko");
    expect(nearest.distanceKm).toBe(0);
    expect(next.listing.id).toBe("del-rosario");
    expect(next.distanceKm).toBeCloseTo(0.51, 1);
  });

  it("keeps listings the same distance away in their original order", () => {
    const twins = [listing("newer", SANCIANGKO), listing("older", SANCIANGKO)];
    expect(ids(listingsWithinRadius(twins, DEL_ROSARIO, 1))).toEqual([
      "newer",
      "older",
    ]);
  });
});

describe("formatDistance", () => {
  it("uses meters under 1 km, to the nearest 10 m", () => {
    expect(formatDistance(0.45)).toBe("450 m");
    expect(formatDistance(0.513)).toBe("510 m");
  });

  it("never says 0 m", () => {
    expect(formatDistance(0)).toBe("10 m");
    expect(formatDistance(0.003)).toBe("10 m");
  });

  it("switches to kilometers with one decimal from 1 km", () => {
    expect(formatDistance(0.998)).toBe("1.0 km");
    expect(formatDistance(1.24)).toBe("1.2 km");
    expect(formatDistance(6.35)).toBe("6.4 km");
  });

  it("uses whole kilometers from 10 km", () => {
    expect(formatDistance(9.97)).toBe("10 km");
    expect(formatDistance(12.4)).toBe("12 km");
  });
});
