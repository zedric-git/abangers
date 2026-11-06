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
>;

/**
 * Checks whether a listing matches a gender policy filter (S2-05, #15, #90).
 *
 * Rules:
 * - Exact match: "Female Only" strictly matches "Female Only" listings.
 * - Exact match: "Male Only" strictly matches "Male Only" listings.
 * - Exact match: "Any / Co-ed" strictly matches "Any / Co-ed" listings.
 * - If no gender filter is set, any listing matches.
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

  return true;
}

/**
 * Filters an array of listings by keyword search and core property attributes (S2-05, #90).
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
    filters.gender,
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
  return count;
}
