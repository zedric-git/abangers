import type { Listing } from "@/types/listing";
import { matchesListingSearch } from "@/lib/search-listings";
import type { ListingFilterParams } from "@/lib/validations/listing-filters";
import { parseHouseRules } from "@/lib/house-rules";
import { canonicalizeFeature, normalizeFeatures } from "@/lib/amenity-aliases";

/**
 * The listing attributes required for searching and filtering (S2-04, S2-05, S2-06, #14, #15, #18).
 */
export type FilterableListing = Pick<
  Listing,
  | "title"
  | "address"
  | "city"
  | "description"
  | "monthly_rent"
  | "property_type"
  | "occupancy_type"
  | "allowed_gender"
> &
  Partial<
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
 * Checks whether a listing matches a gender policy filter (S2-05, #15, #90).
 */
export function matchesGenderPolicy(
  listingGender: string | null | undefined,
  filterGender: string | null | undefined,
): boolean {
  if (!filterGender) {
    return true;
  }

  return listingGender === filterGender;
}

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

/**
 * Checks whether a listing satisfies all active search and filter criteria (S2-04, S2-05, S2-06, #90, #92).
 * All criteria combine with AND logic.
 */
export function matchesListingFilters(
  listing: FilterableListing,
  filters: Partial<ListingFilterParams>,
): boolean {
  // 1. Keyword search (title, address, city, description)
  if (filters.q && !matchesListingSearch(listing, filters.q)) {
    return false;
  }

  // 2. Maximum rent limit
  if (
    filters.max_rent !== undefined &&
    listing.monthly_rent > filters.max_rent
  ) {
    return false;
  }

  // 3. Property type (exact match)
  if (
    filters.property_type &&
    listing.property_type !== filters.property_type
  ) {
    return false;
  }

  // 4. Room / occupancy type (exact match)
  if (filters.occupancy && listing.occupancy_type !== filters.occupancy) {
    return false;
  }

  // 5. Allowed gender policy
  if (
    filters.gender &&
    !matchesGenderPolicy(listing.allowed_gender, filters.gender)
  ) {
    return false;
  }

  // 6. Detailed features (7 categories, subset match with alias normalization)
  if (!matchesListingFeatures(listing, filters.features)) {
    return false;
  }

  // 7. House rules (subset match against parsed standard rules)
  if (!matchesListingHouseRules(listing, filters.rules)) {
    return false;
  }

  return true;
}

/**
 * Filters an array of listings by keyword search, core attributes, amenities, and house rules.
 */
export function filterListings<T extends FilterableListing>(
  listings: T[],
  filters: Partial<ListingFilterParams>,
): T[] {
  return listings.filter((listing) => matchesListingFilters(listing, filters));
}

/**
 * Checks whether any attribute filters (excluding keyword search) are active.
 */
export function hasActiveAttributeFilters(
  filters: Partial<ListingFilterParams>,
): boolean {
  return Boolean(
    filters.max_rent !== undefined ||
    filters.property_type ||
    filters.occupancy ||
    filters.gender ||
    (filters.features && filters.features.length > 0) ||
    (filters.rules && filters.rules.length > 0),
  );
}

/**
 * Returns the count of active attribute filters (excluding keyword search).
 */
export function countActiveAttributeFilters(
  filters: Partial<ListingFilterParams>,
): number {
  let count = 0;
  if (filters.max_rent !== undefined) count += 1;
  if (filters.property_type) count += 1;
  if (filters.occupancy) count += 1;
  if (filters.gender) count += 1;
  if (filters.features) count += filters.features.length;
  if (filters.rules) count += filters.rules.length;
  return count;
}
