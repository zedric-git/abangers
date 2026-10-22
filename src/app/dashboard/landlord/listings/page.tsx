import { redirect } from "next/navigation";
import { Building2, CheckCircle2, Info, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AddListingButton from "@/components/AddListingButton";
import LandlordListingsView from "@/components/LandlordListingsView";
import VerificationBanner from "@/components/VerificationBanner";
import { loadLandlordStatus } from "@/lib/auth/landlord-status";
import { isAddListingLocked } from "@/lib/landlord-status-view";
import {
  MISSING_LISTING_NOTE,
  MISSING_LISTING_NOTICE,
} from "@/lib/listing-lookup";
import {
  countListingsByStatus,
  listingStatusView,
} from "@/lib/listing-status-view";
import { Listing } from "@/types/listing";

export default async function LandlordListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // A listing's View or Edit page sends the landlord here with
  // ?notice=listing-not-found when the listing isn't there (#244). The
  // parameter only picks the note; its text is fixed below, so nothing
  // from the URL is shown on the page.
  const { notice } = await searchParams;
  const showMissingListingNote = notice === MISSING_LISTING_NOTICE;

  const supabase = await createClient();

  // Get current logged in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch listings created by this landlord (RLS + explicit landlord_id
  // query), and where the landlord stands (#205): the banner, and the lock
  // on Add New Listing. status is null if it couldn't be read.
  const [{ data: rawListings, error }, status] = await Promise.all([
    supabase
      .from("listings")
      .select("*")
      .eq("landlord_id", user.id)
      .order("created_at", { ascending: false }),
    loadLandlordStatus(supabase, user.id),
  ]);

  if (error) {
    console.error("Error fetching landlord listings:", error);
  }
  // The listings couldn't be read: the list says so instead of showing the
  // empty state, as on the dashboard (#239).
  const listingsLoadError = error !== null;

  const listings: Listing[] = rawListings ?? [];
  const addListingLocked = isAddListingLocked(status);

  // Compute status summary counts, with the same labels as the status
  // badges (#232). Almost Full listings count only in the total.
  const totalListings = listings.length;
  const statusCounts = countListingsByStatus(listings);
  const availableCount = statusCounts.available;
  const occupiedCount = statusCounts.fully_occupied;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
            My Posted Listings
          </h1>
          <p className="mt-1 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
            Manage your rental properties, monitor room availability, and update
            listing details.
          </p>
        </div>

        <AddListingButton
          locked={addListingLocked}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700"
        />
      </div>

      {/* Why the landlord was sent here from a listing's View or Edit */}
      {showMissingListingNote && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-purple-700 dark:text-purple-400" />
          <p>{MISSING_LISTING_NOTE}</p>
        </div>
      )}

      {/* Not verified / Pending / Rejected (#205); nothing once verified */}
      <VerificationBanner status={status} />

      {/* Quick Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Total Listings
            </p>
            <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {totalListings}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {listingStatusView("available").label}
            </p>
            <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {availableCount}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {listingStatusView("fully_occupied").label}
            </p>
            <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {occupiedCount}
            </p>
          </div>
        </div>
      </div>

      {/* The listings, shared with the dashboard (#239): one card per row
          (the card is a wide row, so it can't sit in a grid), the tabs and
          search, and the error and empty states. The page title above
          already says "My Posted Listings", so the list leaves it out. */}
      <LandlordListingsView
        initialListings={listings}
        addListingLocked={addListingLocked}
        loadError={listingsLoadError}
        showHeading={false}
      />
    </div>
  );
}
