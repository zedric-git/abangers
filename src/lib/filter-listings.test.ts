import { describe, expect, it } from "vitest";
import {
  filterListings,
  matchesGenderPolicy,
  matchesListingFeatures,
  matchesListingHouseRules,
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
    utilities: ["WiFi", "Water included"],
    room_features: ["Bed Provided", "Electric Fan"],
    bathroom_features: ["Shared CR"],
    kitchen_features: ["Shared kitchen"],
    laundry_features: ["Laundry area"],
    safety_features: ["CCTV"],
    amenities: ["Has Parking"],
    house_rules:
      "Cooking Allowed\nNo Curfew\nAdditional Notes: Clean up after cooking",
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
    utilities: ["Wi-Fi Included", "Electricity Included"],
    room_features: ["Air Conditioning", "Table/Desk", "Chair"],
    bathroom_features: ["Private Bathroom/CR"],
    kitchen_features: ["Has Kitchen", "Cooking Allowed"],
    safety_features: ["24/7 security", "Secure/Individual Door Lock"],
    house_rules: "Visitors Allowed\nPets Allowed",
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
    utilities: ["WiFi", "Water included"],
    room_features: ["Cabinet/Wardrobe", "Study area"],
    bathroom_features: ["Shared Bathroom/CR"],
    safety_features: ["CCTV Surveillance", "Gated Property"],
    house_rules: "Curfew at 10pm. No visitors allowed in rooms.", // free-text, not standard pills
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
    utilities: ["Wi-Fi Included", "Water Included", "Electricity Included"],
    room_features: ["Air Conditioning", "Bed Provided", "Cabinet/Wardrobe"],
    bathroom_features: ["Private Bathroom/CR"],
    kitchen_features: ["Kitchenette"],
    laundry_features: ["Has Washing Machine"],
    safety_features: ["Security Guard"],
    amenities: ["Has Parking"],
    house_rules: "No Curfew\nSmoking Allowed",
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

describe("matchesListingFeatures", () => {
  it("returns true when no features are selected", () => {
    expect(matchesListingFeatures(sampleListings[0], [])).toBe(true);
    expect(matchesListingFeatures(sampleListings[0], undefined)).toBe(true);
  });

  it("matches features across columns with alias normalization (seed strings)", () => {
    // Talamban has utilities: ["WiFi", "Water included"], bathroom: ["Shared CR"], kitchen: ["Shared kitchen"]
    expect(
      matchesListingFeatures(sampleListings[0], [
        "Wi-Fi Included",
        "Water Included",
        "Shared Bathroom/CR",
        "Has Kitchen",
      ]),
    ).toBe(true);
  });

  it("uses AND logic requiring all selected features", () => {
    // Banilad has Air Conditioning, but NOT Has Parking
    expect(
      matchesListingFeatures(sampleListings[1], [
        "Air Conditioning",
        "Has Parking",
      ]),
    ).toBe(false);

    // Mandaue has both Air Conditioning and Has Parking
    expect(
      matchesListingFeatures(sampleListings[3], [
        "Air Conditioning",
        "Has Parking",
      ]),
    ).toBe(true);
  });
});

describe("matchesListingHouseRules", () => {
  it("returns true when no rules are selected", () => {
    expect(matchesListingHouseRules(sampleListings[0], [])).toBe(true);
    expect(matchesListingHouseRules(sampleListings[0], undefined)).toBe(true);
  });

  it("matches parsed house rules strictly", () => {
    // Talamban has "Cooking Allowed" and "No Curfew"
    expect(
      matchesListingHouseRules(sampleListings[0], [
        "Cooking Allowed",
        "No Curfew",
      ]),
    ).toBe(true);
    expect(matchesListingHouseRules(sampleListings[0], ["Pets Allowed"])).toBe(
      false,
    );
  });

  it("fails to match free-text seed house rules that are not standard pills (PM Note 2)", () => {
    // Lahug has free-text description, so parseHouseRules returns 0 standard rules
    expect(
      matchesListingHouseRules(sampleListings[2], ["Visitors Allowed"]),
    ).toBe(false);
  });

  it("keeps features and rules separate for 'Cooking Allowed' (PM Note 1)", () => {
    // Banilad has kitchen_features: ["Cooking Allowed"] but house_rules: "Visitors Allowed\nPets Allowed"
    // Filtering for rule "Cooking Allowed" should NOT match Banilad
    expect(
      matchesListingHouseRules(sampleListings[1], ["Cooking Allowed"]),
    ).toBe(false);

    // But filtering for feature "Cooking Allowed" SHOULD match Banilad
    expect(matchesListingFeatures(sampleListings[1], ["Cooking Allowed"])).toBe(
      true,
    );
  });
});

describe("filterListings", () => {
  it("returns all listings when no filters or search query are provided", () => {
    const results = filterListings(sampleListings, {});
    expect(results).toHaveLength(4);
  });

  it("filters by max rent (boundary checks)", () => {
    const under4k = filterListings(sampleListings, { max_rent: 4000 });
    expect(under4k.map((l) => l.title)).toEqual([
      "Talamban Budget Bedspace",
      "Lahug Female Dormitory",
    ]);

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
    const femaleOnly = filterListings(sampleListings, {
      gender: "Female Only",
    });
    expect(femaleOnly.map((l) => l.title)).toEqual(["Lahug Female Dormitory"]);
  });

  it("filters by multiple features with alias mapping and AND logic", () => {
    // Both Talamban and Lahug have WiFi and Water Included (seed strings)
    const withWifiAndWater = filterListings(sampleListings, {
      features: ["Wi-Fi Included", "Water Included"],
    });
    expect(withWifiAndWater.map((l) => l.title)).toEqual([
      "Talamban Budget Bedspace",
      "Lahug Female Dormitory",
      "Mandaue Condo Studio",
    ]);

    // Only Mandaue has Air Conditioning AND Has Washing Machine
    const modern = filterListings(sampleListings, {
      features: ["Air Conditioning", "Has Washing Machine"],
    });
    expect(modern.map((l) => l.title)).toEqual(["Mandaue Condo Studio"]);
  });

  it("filters by house rules", () => {
    const pets = filterListings(sampleListings, {
      rules: ["Pets Allowed"],
    });
    expect(pets.map((l) => l.title)).toEqual(["Banilad Co-ed Studio Room"]);
  });

  it("combines keyword search, max rent, core filters, features, and rules seamlessly", () => {
    const matched = filterListings(sampleListings, {
      q: "Cebu",
      max_rent: 7000,
      gender: "Any / Co-ed",
      features: ["Air Conditioning", "Private Bathroom/CR"],
      rules: ["Pets Allowed"],
    });
    expect(matched.map((l) => l.title)).toEqual(["Banilad Co-ed Studio Room"]);
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
    expect(hasActiveAttributeFilters({ features: ["Wi-Fi Included"] })).toBe(
      true,
    );
    expect(hasActiveAttributeFilters({ rules: ["No Curfew"] })).toBe(true);
  });

  it("correctly counts active attribute filters", () => {
    expect(countActiveAttributeFilters({})).toBe(0);
    expect(countActiveAttributeFilters({ q: "Cebu" })).toBe(0);
    expect(
      countActiveAttributeFilters({
        max_rent: 5000,
        gender: "Female Only",
        property_type: "Boarding House",
        features: ["Wi-Fi Included", "Air Conditioning"],
        rules: ["No Curfew"],
      }),
    ).toBe(6);
  });
});
