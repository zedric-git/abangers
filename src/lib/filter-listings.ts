import type { Listing } from "@/types/listing";
import { matchesListingSearch } from "@/lib/search-listings";
import type { ListingFilterParams } from "@/lib/validations/listing-filters";

/**
 * The listing attributes required for searching and filtering (S2-04, S2-05, #14, #15).
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
> & {
  amenities?: string[] | null;
  utilities?: string[] | null;
  room_features?: string[] | null;
  bathroom_features?: string[] | null;
  kitchen_features?: string[] | null;
  laundry_features?: string[] | null;
  safety_features?: string[] | null;
  house_rules?: string[] | string | null;
};

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

  if (filterGender === "Any / Co-ed" || filterGender === "Any Gender") {
    return listingGender === "Any / Co-ed" || listingGender === "Any Gender";
  }

  return listingGender === filterGender;
}

/**
 * Checks whether a listing matches an occupancy type filter (supporting Private Room / Single Room aliases).
 */
export function matchesOccupancyType(
  listingOccupancy: string | null | undefined,
  filterOccupancy: string | null | undefined,
): boolean {
  if (!filterOccupancy) {
    return true;
  }

  if (filterOccupancy === "Private Room" || filterOccupancy === "Single Room") {
    return (
      listingOccupancy === "Private Room" || listingOccupancy === "Single Room"
    );
  }

  return listingOccupancy === filterOccupancy;
}

/**
 * Checks whether a listing satisfies all active search and filter criteria (S2-05, #90).
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

  // 2. Minimum rent limit
  if (
    filters.min_rent !== undefined &&
    listing.monthly_rent < filters.min_rent
  ) {
    return false;
  }

  // 3. Maximum rent limit
  if (
    filters.max_rent !== undefined &&
    listing.monthly_rent > filters.max_rent
  ) {
    return false;
  }

  // 4. Property type
  if (
    filters.property_type &&
    listing.property_type !== filters.property_type
  ) {
    return false;
  }

  // 5. Room / occupancy type
  if (
    filters.occupancy &&
    !matchesOccupancyType(listing.occupancy_type, filters.occupancy)
  ) {
    return false;
  }

  // 6. Allowed gender policy
  if (
    filters.gender &&
    !matchesGenderPolicy(listing.allowed_gender, filters.gender)
  ) {
    return false;
  }

  // 7. Location Near
  if (filters.near && filters.near.trim()) {
    const near = filters.near.trim().toLowerCase();
    const matchesNear =
      (listing.address && listing.address.toLowerCase().includes(near)) ||
      (listing.city && listing.city.toLowerCase().includes(near)) ||
      listing.title.toLowerCase().includes(near);
    if (!matchesNear) {
      return false;
    }
  }

  // 8. Amenities: Parking
  if (filters.parking) {
    const amenities = listing.amenities || [];
    const hasParking = amenities.some((a) => /parking/i.test(a));
    if (!hasParking) {
      return false;
    }
  }

  // 9. Utilities Included
  if (filters.utilities && filters.utilities.length > 0) {
    const list = listing.utilities || [];
    const hasAll = filters.utilities.every((u) => list.includes(u));
    if (!hasAll) return false;
  }

  // 10. Room Features
  if (filters.room_features && filters.room_features.length > 0) {
    const list = listing.room_features || [];
    const hasAll = filters.room_features.every((rf) => list.includes(rf));
    if (!hasAll) return false;
  }

  // 11. Bathroom Features
  if (filters.bathroom && filters.bathroom.length > 0) {
    const list = listing.bathroom_features || [];
    const hasAnyOrAll = filters.bathroom.every((b) => list.includes(b));
    if (!hasAnyOrAll) return false;
  }

  // 12. Kitchen & Food
  if (filters.kitchen && filters.kitchen.length > 0) {
    const list = listing.kitchen_features || [];
    const hasAll = filters.kitchen.every((k) => list.includes(k));
    if (!hasAll) return false;
  }

  // 13. Laundry
  if (filters.laundry && filters.laundry.length > 0) {
    const list = listing.laundry_features || [];
    const hasAll = filters.laundry.every((l) => list.includes(l));
    if (!hasAll) return false;
  }

  // 14. Safety & Security
  if (filters.safety && filters.safety.length > 0) {
    const list = listing.safety_features || [];
    const hasAll = filters.safety.every((s) => list.includes(s));
    if (!hasAll) return false;
  }

  // 15. House Rules
  if (filters.house_rules && filters.house_rules.length > 0) {
    const rulesText = Array.isArray(listing.house_rules)
      ? listing.house_rules.join("\n").toLowerCase()
      : (listing.house_rules || "").toLowerCase();
    const hasAll = filters.house_rules.every((hr) =>
      rulesText.includes(hr.toLowerCase()),
    );
    if (!hasAll) return false;
  }

  return true;
}

/**
 * Filters an array of listings by keyword search and property attributes (S2-05, #90).
 */
export function filterListings<T extends FilterableListing>(
  listings: T[],
  filters: Partial<ListingFilterParams>,
): T[] {
  return listings.filter((listing) => matchesListingFilters(listing, filters));
}

/**
 * Returns the count of active attribute filters (excluding keyword search).
 */
export function countActiveAttributeFilters(
  filters: Partial<ListingFilterParams>,
): number {
  let count = 0;
  if (filters.min_rent !== undefined) count += 1;
  if (filters.max_rent !== undefined) count += 1;
  if (filters.property_type) count += 1;
  if (filters.occupancy) count += 1;
  if (filters.gender) count += 1;
  if (filters.near && filters.near.trim()) count += 1;
  if (filters.distance) count += 1;
  if (filters.parking) count += 1;
  if (filters.utilities?.length) count += filters.utilities.length;
  if (filters.room_features?.length) count += filters.room_features.length;
  if (filters.bathroom?.length) count += filters.bathroom.length;
  if (filters.kitchen?.length) count += filters.kitchen.length;
  if (filters.laundry?.length) count += filters.laundry.length;
  if (filters.safety?.length) count += filters.safety.length;
  if (filters.house_rules?.length) count += filters.house_rules.length;
  return count;
}

/**
 * Checks whether any attribute filters (excluding keyword search) are active.
 */
export function hasActiveAttributeFilters(
  filters: Partial<ListingFilterParams>,
): boolean {
  return countActiveAttributeFilters(filters) > 0;
}
