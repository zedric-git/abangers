import { listingStatusView } from "@/lib/listing-status-view";
import type { Listing } from "@/types/listing";

/**
 * The landlord dashboard's listings toolbar (#232): the status pills and
 * the search box. Pure functions, so they can be unit-tested
 * (filter-landlord-listings.test.ts).
 *
 * The filtering runs in the browser over the listings the page already
 * loaded: they're only the landlord's own (RLS), and a landlord has a
 * handful, so there's no need for a new query.
 */

export type ListingsTab =
  "all" | "active" | "with_inquiries" | "occupied" | "archived";

/** The 5 tabs spanning the grid width in the prototype. */
export const LISTINGS_TABS: { value: ListingsTab; label: string }[] = [
  { value: "all", label: "All Listings" },
  { value: "active", label: "Active" },
  { value: "with_inquiries", label: "With Inquiries" },
  { value: "occupied", label: "Occupied" },
  { value: "archived", label: "Archived" },
];

/** The columns the toolbar looks at; the tests pass just these. */
export type FilterableListing = Pick<
  Listing,
  "title" | "address" | "city" | "availability_status"
>;

/** Whether `listing` belongs on `tab`. Active and Occupied are status groups. */
function isOnTab(listing: FilterableListing, tab: ListingsTab): boolean {
  if (tab === "all") {
    return true;
  }
  if (tab === "with_inquiries" || tab === "archived") {
    return false;
  }
  return listingStatusView(listing.availability_status).group === tab;
}

/**
 * Whether the title, address or city contains `search`, ignoring case and
 * spaces at either end. An empty search matches every listing.
 */
function matchesSearch(listing: FilterableListing, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (query === "") {
    return true;
  }
  return [listing.title, listing.address, listing.city ?? ""].some((field) =>
    field.toLowerCase().includes(query),
  );
}

/** The listings on `tab` that match `search`, in the order they came in. */
export function filterLandlordListings<T extends FilterableListing>(
  listings: T[],
  filters: { tab: ListingsTab; search: string },
): T[] {
  return listings.filter(
    (listing) =>
      isOnTab(listing, filters.tab) && matchesSearch(listing, filters.search),
  );
}

/**
 * How many listings each tab has. The search doesn't change these.
 * The dashboard's Active Listings card uses the same number as the Active tab.
 */
export function countListingsByTab(
  listings: FilterableListing[],
): Record<ListingsTab, number> {
  return {
    all: listings.length,
    active: listings.filter((listing) => isOnTab(listing, "active")).length,
    with_inquiries: 0,
    occupied: listings.filter((listing) => isOnTab(listing, "occupied")).length,
    archived: 0,
  };
}
