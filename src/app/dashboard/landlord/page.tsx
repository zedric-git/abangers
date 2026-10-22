import { Building2, Eye, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AddListingButton from "@/components/AddListingButton";
import LandlordListingsView from "@/components/LandlordListingsView";
import VerificationBanner from "@/components/VerificationBanner";
import {
  loadLandlordStatus,
  type LandlordStatus,
} from "@/lib/auth/landlord-status";
import { isAddListingLocked } from "@/lib/landlord-status-view";
import { countListingsByTab } from "@/lib/filter-landlord-listings";
import { Listing } from "@/types/listing";

export default async function LandlordDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let listings: Listing[] = [];
  // The listings couldn't be read: the list says so instead of showing the
  // "No listings created yet" empty state (#232).
  let listingsLoadError = false;
  // Where the landlord stands (#205): the banner, and the lock on Add New
  // Listing. null if it couldn't be read.
  let status: LandlordStatus | null = null;

  if (user) {
    const [listingsResult, landlordStatus] = await Promise.all([
      supabase
        .from("listings")
        .select("*")
        .eq("landlord_id", user.id)
        .order("created_at", { ascending: false }),
      loadLandlordStatus(supabase, user.id),
    ]);

    if (listingsResult.error) {
      console.error("Error fetching landlord listings:", listingsResult.error);
      listingsLoadError = true;
    }
    listings = listingsResult.data ?? [];
    status = landlordStatus;
  }

  // Available and Almost Full listings: the same number as the list's
  // Active tab (#232).
  const activeCount = countListingsByTab(listings).active;
  const addListingLocked = isAddListingLocked(status);

  return (
    <div className="w-full space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">
            Landlord Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your rental listings, monitor inquiries, and update property
            details.
          </p>
        </div>

        <AddListingButton
          locked={addListingLocked}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-purple-600 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-purple-700"
        />
      </div>

      {/* Not verified / Pending / Rejected (#205); nothing once verified */}
      <VerificationBanner status={status} />

      {/* Quick Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Active Listings
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {activeCount}
            </span>
            <span className="ml-2 text-xs text-zinc-400">
              properties listed
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Total Inquiries
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              0
            </span>
            <span className="ml-2 text-xs text-zinc-400">renter messages</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Total Views
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Eye className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              0
            </span>
            <span className="ml-2 text-xs text-zinc-400">views this month</span>
          </div>
        </div>
      </div>

      {/* Posted Listings Section */}
      <LandlordListingsView
        initialListings={listings}
        addListingLocked={addListingLocked}
        loadError={listingsLoadError}
      />
    </div>
  );
}
