import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  loadPendingVerifications,
  type PendingVerification,
} from "@/lib/auth/review-verification";
import {
  countListingsByStatus,
  type ListingStatus,
} from "@/lib/listing-status-view";

/**
 * The admin dashboard's home (#294): a few real numbers, and the oldest
 * verifications waiting for review. It showed sample data before: made-up
 * stats, verifications and activity (#309).
 *
 * Everything is read as the signed-in admin, through RLS: profiles (any
 * signed-in user can read them), listings (anyone), landlord_verifications
 * (admins, 0014). No service key.
 */

/** How many waiting verifications the home lists; the rest are on the Verifications page. */
export const HOME_PENDING_LIMIT = 3;

/** The home's numbers. null: that number couldn't be read. */
export interface AdminOverview {
  renters: number | null;
  landlords: number | null;
  listingsByStatus: Record<ListingStatus, number> | null;
  pendingVerifications: number | null;
  /** Landlords with an approved verification: the ones who can post. */
  verifiedLandlords: number | null;
}

export interface AdminOverviewData {
  overview: AdminOverview;
  /** Oldest first, or null if they couldn't be read. */
  pending: PendingVerification[] | null;
}

/** Loads the home's numbers and the waiting verifications, all at once. */
export async function loadAdminOverview(
  supabase: SupabaseClient<Database>,
): Promise<AdminOverviewData> {
  const [renters, landlords, listings, approved, pending] = await Promise.all([
    countProfiles(supabase, "renter"),
    countProfiles(supabase, "landlord"),
    supabase.from("listings").select("availability_status"),
    supabase
      .from("landlord_verifications")
      .select("landlord_id")
      .eq("status", "approved"),
    loadPendingVerifications(supabase),
  ]);

  if (listings.error) {
    console.error("Admin overview listings read error:", listings.error);
  }
  if (approved.error) {
    console.error("Admin overview verifications read error:", approved.error);
  }

  return {
    overview: {
      renters,
      landlords,
      listingsByStatus: listings.error
        ? null
        : countListingsByStatus(listings.data),
      pendingVerifications: pending.ok ? pending.items.length : null,
      verifiedLandlords: approved.error
        ? null
        : countDistinctLandlords(approved.data),
    },
    pending: pending.ok ? pending.items : null,
  };
}

// How many profiles have the role, without loading them.
async function countProfiles(
  supabase: SupabaseClient<Database>,
  role: "renter" | "landlord",
): Promise<number | null> {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", role);

  if (error) {
    console.error(`Admin overview ${role} count error:`, error);
    return null;
  }
  return count ?? 0;
}

/** Each landlord once, however many approved submissions they have. */
export function countDistinctLandlords(
  rows: { landlord_id: string }[],
): number {
  return new Set(rows.map((row) => row.landlord_id)).size;
}

// ── What the home's stat cards say ──────────────────────────────────

/** One stat card on the home. */
export interface OverviewStat {
  key: "users" | "listings" | "pending" | "verified";
  label: string;
  value: string;
  detail: string;
  /** Draws the admin's eye: something is waiting for them. */
  highlight: boolean;
}

/** What a card shows for a number it couldn't read. */
export const UNKNOWN_COUNT = "—";
const UNKNOWN_DETAIL = "Couldn't load this number. Refresh to try again.";

// "1 renter", "3 renters"
function countOf(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** The four stat cards, in order, from the home's numbers. */
export function overviewStats(overview: AdminOverview): OverviewStat[] {
  const {
    renters,
    landlords,
    listingsByStatus,
    pendingVerifications,
    verifiedLandlords,
  } = overview;

  const users =
    renters !== null && landlords !== null ? renters + landlords : null;
  const listings = listingsByStatus
    ? listingsByStatus.available +
      listingsByStatus.almost_full +
      listingsByStatus.fully_occupied
    : null;

  return [
    {
      key: "users",
      label: "Users",
      value: users === null ? UNKNOWN_COUNT : String(users),
      detail:
        renters === null || landlords === null
          ? UNKNOWN_DETAIL
          : `${countOf(renters, "renter", "renters")} · ${countOf(landlords, "landlord", "landlords")}`,
      highlight: false,
    },
    {
      key: "listings",
      label: "Listings",
      value: listings === null ? UNKNOWN_COUNT : String(listings),
      detail: listingsByStatus
        ? `${listingsByStatus.available} available · ${listingsByStatus.almost_full} almost full · ${listingsByStatus.fully_occupied} full`
        : UNKNOWN_DETAIL,
      highlight: false,
    },
    {
      key: "pending",
      label: "Pending Verifications",
      value:
        pendingVerifications === null
          ? UNKNOWN_COUNT
          : String(pendingVerifications),
      detail:
        pendingVerifications === null
          ? UNKNOWN_DETAIL
          : pendingVerifications > 0
            ? "Waiting for your review"
            : "Nothing waiting for review",
      highlight: (pendingVerifications ?? 0) > 0,
    },
    {
      key: "verified",
      label: "Verified Landlords",
      value:
        verifiedLandlords === null ? UNKNOWN_COUNT : String(verifiedLandlords),
      detail:
        verifiedLandlords === null
          ? UNKNOWN_DETAIL
          : landlords === null
            ? "Can post listings"
            : // Reads on from the number above it: "1 / of 9 landlords can
              // post listings".
              `of ${countOf(landlords, "landlord", "landlords")} can post listings`,
      highlight: false,
    },
  ];
}
