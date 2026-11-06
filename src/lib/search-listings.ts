import type { Listing } from "@/types/listing";

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
