import { describe, expect, it } from "vitest";
import {
  filterListings,
  matchesGenderPolicy,
  hasActiveAttributeFilters,
  countActiveAttributeFilters,
  type FilterableListing,
} from "./filter-listings";

const sampleListings: FilterableListing[] = [
  {
    title: "Talamban Budget Bedspace",
    address: "123 Gov. Cuenco Ave, Talamban",
    city: "Cebu City",
    description: "Affordable student bedspace near USC TC with fast WiFi.",
    monthly_rent: 2500,
    property_type: "Boarding House",
    occupancy_type: "Bedspace",
    allowed_gender: "Male Only",
  },
  {
    title: "Banilad Co-ed Studio Room",
    address: "456 Banilad Road",
    city: "Cebu City",
    description: "Private studio room near UV and UC Banilad.",
    monthly_rent: 6500,
    property_type: "Apartment",
    occupancy_type: "Single Room",
    allowed_gender: "Any / Co-ed",
  },
  {
    title: "Lahug Female Dormitory",
    address: "789 Salinas Drive, Lahug",
    city: "Cebu City",
    description: "Safe dormitory for female students and workers near IT Park.",
    monthly_rent: 4000,
    property_type: "Dormitory",
    occupancy_type: "Shared Room",
    allowed_gender: "Female Only",
  },
  {
    title: "Mandaue Condo Studio",
    address: "101 A.S. Fortuna St",
    city: "Mandaue City",
    description: "Modern condo studio for young professionals.",
    monthly_rent: 12000,
    property_type: "Condo",
    occupancy_type: "Studio",
    allowed_gender: "Any / Co-ed",
  },
];

describe("matchesGenderPolicy", () => {
  it("allows all listings if no gender filter is set", () => {
    expect(matchesGenderPolicy("Female Only", undefined)).toBe(true);
    expect(matchesGenderPolicy("Male Only", undefined)).toBe(true);
    expect(matchesGenderPolicy("Any / Co-ed", undefined)).toBe(true);
  });

  it("strictly matches Female Only when filter is Female Only", () => {
    expect(matchesGenderPolicy("Female Only", "Female Only")).toBe(true);
    expect(matchesGenderPolicy("Any / Co-ed", "Female Only")).toBe(false);
    expect(matchesGenderPolicy("Male Only", "Female Only")).toBe(false);
  });

  it("strictly matches Male Only when filter is Male Only", () => {
    expect(matchesGenderPolicy("Male Only", "Male Only")).toBe(true);
    expect(matchesGenderPolicy("Any / Co-ed", "Male Only")).toBe(false);
    expect(matchesGenderPolicy("Female Only", "Male Only")).toBe(false);
  });

  it("strictly matches Any / Co-ed when filter is Any / Co-ed", () => {
    expect(matchesGenderPolicy("Any / Co-ed", "Any / Co-ed")).toBe(true);
    expect(matchesGenderPolicy("Female Only", "Any / Co-ed")).toBe(false);
    expect(matchesGenderPolicy("Male Only", "Any / Co-ed")).toBe(false);
  });
});

describe("filterListings", () => {
  it("returns all listings when no filters or search query are provided", () => {
    const results = filterListings(sampleListings, {});
    expect(results).toHaveLength(4);
  });

  it("filters by max rent (boundary checks)", () => {
    // 2500, 4000 are <= 4000
    const under4k = filterListings(sampleListings, { max_rent: 4000 });
    expect(under4k.map((l) => l.title)).toEqual([
      "Talamban Budget Bedspace",
      "Lahug Female Dormitory",
    ]);

    // 2500 is <= 2500 (exact equality matches)
    const under2500 = filterListings(sampleListings, { max_rent: 2500 });
    expect(under2500.map((l) => l.title)).toEqual(["Talamban Budget Bedspace"]);
  });

  it("filters by property type", () => {
    const apartments = filterListings(sampleListings, {
      property_type: "Apartment",
    });
    expect(apartments.map((l) => l.title)).toEqual([
      "Banilad Co-ed Studio Room",
    ]);
  });

  it("filters by occupancy type", () => {
    const bedspaces = filterListings(sampleListings, {
      occupancy: "Bedspace",
    });
    expect(bedspaces.map((l) => l.title)).toEqual(["Talamban Budget Bedspace"]);
  });

  it("filters by allowed gender strictly matching the policy", () => {
    // Female Only filter matches strictly Lahug Female Dormitory
    const femaleOnly = filterListings(sampleListings, {
      gender: "Female Only",
    });
    expect(femaleOnly.map((l) => l.title)).toEqual(["Lahug Female Dormitory"]);

    // Male Only filter matches strictly Talamban Budget Bedspace
    const maleOnly = filterListings(sampleListings, {
      gender: "Male Only",
    });
    expect(maleOnly.map((l) => l.title)).toEqual(["Talamban Budget Bedspace"]);

    // Any / Co-ed filter matches strictly Banilad & Mandaue
    const coed = filterListings(sampleListings, {
      gender: "Any / Co-ed",
    });
    expect(coed.map((l) => l.title)).toEqual([
      "Banilad Co-ed Studio Room",
      "Mandaue Condo Studio",
    ]);
  });

  it("combines keyword search and filters using AND logic", () => {
    // Search "USC" + max_rent 3000
    const results = filterListings(sampleListings, {
      q: "USC",
      max_rent: 3000,
    });
    expect(results.map((l) => l.title)).toEqual(["Talamban Budget Bedspace"]);

    // Search "USC" + max_rent 2000 (none cheap enough)
    const noneCheapEnough = filterListings(sampleListings, {
      q: "USC",
      max_rent: 2000,
    });
    expect(noneCheapEnough).toHaveLength(0);

    // Search "Cebu" + property_type "Dormitory" + gender "Female Only"
    const dorm = filterListings(sampleListings, {
      q: "Cebu",
      property_type: "Dormitory",
      gender: "Female Only",
    });
    expect(dorm.map((l) => l.title)).toEqual(["Lahug Female Dormitory"]);
  });
});

describe("filter helpers", () => {
  it("correctly identifies whether attribute filters are active", () => {
    expect(hasActiveAttributeFilters({})).toBe(false);
    expect(hasActiveAttributeFilters({ q: "Cebu" })).toBe(false);
    expect(hasActiveAttributeFilters({ max_rent: 5000 })).toBe(true);
    expect(hasActiveAttributeFilters({ property_type: "Apartment" })).toBe(
      true,
    );
  });

  it("correctly counts active attribute filters", () => {
    expect(countActiveAttributeFilters({})).toBe(0);
    expect(countActiveAttributeFilters({ q: "Cebu" })).toBe(0);
    expect(
      countActiveAttributeFilters({
        max_rent: 5000,
        gender: "Female Only",
        property_type: "Boarding House",
      }),
    ).toBe(3);
  });
});
