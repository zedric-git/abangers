import { describe, expect, it } from "vitest";
import {
  matchesListingFeatures,
  matchesListingHouseRules,
  type FilterableListing,
} from "./filter-listings";

// The titles are only there to read the tests by.
const sampleListings: (FilterableListing & { title: string })[] = [
  {
    title: "Talamban Budget Bedspace",
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
    utilities: ["Wi-Fi Included", "Electricity Included"],
    room_features: ["Air Conditioning", "Table/Desk", "Chair"],
    bathroom_features: ["Private Bathroom/CR"],
    kitchen_features: ["Has Kitchen", "Cooking Allowed"],
    safety_features: ["24/7 security", "Secure/Individual Door Lock"],
    house_rules: "Visitors Allowed\nPets Allowed",
  },
  {
    title: "Lahug Female Dormitory",
    utilities: ["WiFi", "Water included"],
    room_features: ["Cabinet/Wardrobe", "Study area"],
    bathroom_features: ["Shared Bathroom/CR"],
    safety_features: ["CCTV Surveillance", "Gated Property"],
    house_rules: "Curfew at 10pm. No visitors allowed in rooms.", // free-text, not standard pills
  },
  {
    title: "Mandaue Condo Studio",
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

// The titles of the samples that pass a filter, in order.
function titlesMatching(
  matches: (listing: FilterableListing) => boolean,
): string[] {
  return sampleListings.filter(matches).map((listing) => listing.title);
}

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

  it("filters a list by several features, with aliases", () => {
    // WiFi and Water Included, written either way
    expect(
      titlesMatching((listing) =>
        matchesListingFeatures(listing, ["Wi-Fi Included", "Water Included"]),
      ),
    ).toEqual([
      "Talamban Budget Bedspace",
      "Lahug Female Dormitory",
      "Mandaue Condo Studio",
    ]);

    // Only Mandaue has Air Conditioning AND Has Washing Machine
    expect(
      titlesMatching((listing) =>
        matchesListingFeatures(listing, [
          "Air Conditioning",
          "Has Washing Machine",
        ]),
      ),
    ).toEqual(["Mandaue Condo Studio"]);
  });

  it("matches the form's bathroom options, which #300's own options didn't (#309)", () => {
    expect(
      titlesMatching((listing) =>
        matchesListingFeatures(listing, ["Private Bathroom/CR"]),
      ),
    ).toEqual(["Banilad Co-ed Studio Room", "Mandaue Condo Studio"]);
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

  it("filters a list by house rules", () => {
    expect(
      titlesMatching((listing) =>
        matchesListingHouseRules(listing, ["Pets Allowed"]),
      ),
    ).toEqual(["Banilad Co-ed Studio Room"]);
    expect(
      titlesMatching((listing) =>
        matchesListingHouseRules(listing, ["No Curfew"]),
      ),
    ).toEqual(["Talamban Budget Bedspace", "Mandaue Condo Studio"]);
  });
});
