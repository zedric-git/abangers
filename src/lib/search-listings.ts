import type { Listing } from "@/types/listing";
import { listingSearchSchema } from "@/lib/validations/listing";

/**
 * The listing fields searched by keyword (S2-04, #88).
 */
export type SearchableListing = Pick<
  Listing,
  "title" | "address" | "city" | "description"
>;

/**
 * Checks whether a listing matches the search query (S2-04, #88).
 *
 * Checks `title`, `address`, `city`, and `description` (case-insensitive).
 * Landmarks and universities written in listing descriptions or addresses
 * (e.g. "USC", "IT Park", "UP Cebu", "Cebu City") naturally match.
 *
 * An empty or whitespace-only query matches all listings.
 */
export function matchesListingSearch(
  listing: SearchableListing,
  query: string,
): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return true;
  }

  const searchableText = [
    listing.title,
    listing.address,
    listing.city ?? "",
    listing.description ?? "",
  ]
    .join(" ")
    .toLowerCase();

  // If the exact phrase matches, it's an immediate match.
  if (searchableText.includes(trimmed)) {
    return true;
  }

  // Otherwise, match if all whitespace-separated words/tokens appear in the text.
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return true;
  }

  return tokens.every((token) => searchableText.includes(token));
}

/**
 * Filters an array of listings by keyword search query (S2-04, #88).
 */
export function filterListings<T extends SearchableListing>(
  listings: T[],
  query: string,
): T[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return listings;
  }
  return listings.filter((listing) => matchesListingSearch(listing, trimmed));
}

/**
 * Parses and sanitizes a search query string or URL search parameters object (S2-04, #88).
 * Falls back to an empty string on invalid or overly long input.
 */
export function parseSearchQuery(searchParams: unknown): string {
  const result = listingSearchSchema.safeParse(
    typeof searchParams === "object" && searchParams !== null
      ? searchParams
      : { q: searchParams },
  );

  return result.success ? result.data.q : "";
}
