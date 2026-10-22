import {
  parseAvailabilityStatus,
  type ListingInput,
} from "@/lib/validations/listing";

/**
 * How a listing's availability status looks, in one place (#232), without
 * any React, so it can be unit-tested (listing-status-view.test.ts). The
 * listing cards' status toggle (ListingStatusToggle), the listing detail
 * view and the dashboard counts all use it, so each status has the same
 * label and colour everywhere.
 */

/** One of the three statuses the database allows. */
export type ListingStatus = ListingInput["availability_status"];

/**
 * The listings toolbar's tabs group the statuses: a listing renters can
 * still ask about is Active, a full one is Occupied.
 */
export type ListingStatusGroup = "active" | "occupied";

export interface ListingStatusView {
  status: ListingStatus;
  label: string;
  group: ListingStatusGroup;
  /** The badge: a solid fill, so it reads the same on a card and on a photo. */
  badgeClassName: string;
  /** The status's icon in the status menu, on a white or dark menu. */
  iconClassName: string;
}

/** The three statuses, in the order the status menu lists them. */
export const LISTING_STATUSES: ListingStatus[] = [
  "available",
  "almost_full",
  "fully_occupied",
];

// Green, amber, red. White text on amber is hard to read, so Almost Full
// uses dark text instead.
const VIEWS: Record<ListingStatus, ListingStatusView> = {
  available: {
    status: "available",
    label: "Available",
    group: "active",
    badgeClassName: "border-emerald-700 bg-emerald-700 text-white",
    iconClassName: "text-emerald-600 dark:text-emerald-400",
  },
  almost_full: {
    status: "almost_full",
    label: "Almost Full",
    group: "active",
    badgeClassName: "border-amber-400 bg-amber-400 text-amber-950",
    iconClassName: "text-amber-500 dark:text-amber-400",
  },
  fully_occupied: {
    status: "fully_occupied",
    label: "Fully Occupied",
    group: "occupied",
    badgeClassName: "border-rose-600 bg-rose-600 text-white",
    iconClassName: "text-rose-600 dark:text-rose-400",
  },
};

/**
 * The view for a listing's status, as the database or the form gives it.
 * The column is plain text in the generated types, so anything that isn't
 * one of the three statuses shows as Available, the same fallback
 * parseAvailabilityStatus uses.
 */
export function listingStatusView(
  value: string | null | undefined,
): ListingStatusView {
  return VIEWS[parseAvailabilityStatus(value)];
}

/** How many of `listings` have each status, for the stat cards. */
export function countListingsByStatus(
  listings: { availability_status: string }[],
): Record<ListingStatus, number> {
  const counts: Record<ListingStatus, number> = {
    available: 0,
    almost_full: 0,
    fully_occupied: 0,
  };
  for (const listing of listings) {
    counts[listingStatusView(listing.availability_status).status] += 1;
  }
  return counts;
}
