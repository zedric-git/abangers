import type { Listing } from "@/types/listing";
import { parseHouseRules } from "@/lib/house-rules";
import { canonicalizeFeature, normalizeFeatures } from "@/lib/amenity-aliases";

/**
 * Find a Place's amenity and house-rule filters (S2-06, #18, #92), used by
 * PublicListingsView on /listings and the renter's Find a Place (#309).
 * The options come from the listing form's own lists
 * (src/lib/listing-features.ts), so a filter only offers what a landlord
 * can tick.
 */

/** The listing columns these filters read. */
export type FilterableListing = Partial<
  Pick<
    Listing,
    | "amenities"
    | "utilities"
    | "room_features"
    | "bathroom_features"
    | "kitchen_features"
    | "laundry_features"
    | "safety_features"
    | "house_rules"
  >
>;

/**
 * Checks whether a listing contains ALL requested features (S2-06, #18, #92).
 *
 * Rules:
 * - Collects values across all 7 feature columns (amenities, utilities, room_features,
 *   bathroom_features, kitchen_features, laundry_features, safety_features).
 * - Resolves legacy names and seed strings through `normalizeFeatures` (e.g. "WiFi" -> "Wi-Fi Included").
 * - Applies AND logic (listing must have every selected feature).
 * - If no features requested, passes all listings.
 */
export function matchesListingFeatures(
  listing: FilterableListing,
  selectedFeatures?: readonly string[],
): boolean {
  if (!selectedFeatures || selectedFeatures.length === 0) {
    return true;
  }

  const rawFeatures: string[] = [
    ...(listing.amenities ?? []),
    ...(listing.utilities ?? []),
    ...(listing.room_features ?? []),
    ...(listing.bathroom_features ?? []),
    ...(listing.kitchen_features ?? []),
    ...(listing.laundry_features ?? []),
    ...(listing.safety_features ?? []),
  ];

  const canonicalListingSet = new Set(normalizeFeatures(rawFeatures));

  for (const feature of selectedFeatures) {
    const canonicalNeeded = canonicalizeFeature(feature);
    if (!canonicalListingSet.has(canonicalNeeded)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks whether a listing matches ALL requested house rules (S2-06, #18, #92).
 *
 * Rules:
 * - Only evaluates against parsed house rules from `parseHouseRules` (separate from feature columns, PM Note 1).
 *   Free text never counts as a ticked rule: "Visitors allowed in the lobby
 *   until 8 PM" isn't Visitors Allowed (PM Note 2).
 * - Applies AND logic (listing must have every selected rule).
 * - If no rules requested, passes all listings.
 */
export function matchesListingHouseRules(
  listing: FilterableListing,
  selectedRules?: readonly string[],
): boolean {
  if (!selectedRules || selectedRules.length === 0) {
    return true;
  }

  const parsed = parseHouseRules(listing.house_rules ?? "").rules;
  const listingRuleSet = new Set(parsed.map((r) => r.toLowerCase()));

  for (const rule of selectedRules) {
    if (!listingRuleSet.has(rule.toLowerCase())) {
      return false;
    }
  }

  return true;
}
