import { Building2, Eye, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AddListingButton from "@/components/AddListingButton";
import LandlordListingsView from "@/components/LandlordListingsView";
import VerificationBanner from "@/components/VerificationBanner";
import {
  loadLandlordStatus,
  type LandlordStatus,
} from "@/lib/auth/landlord-status";
import {
  isAddListingLocked,
  newListingPageView,
} from "@/lib/landlord-status-view";
import { countListingsByTab } from "@/lib/filter-landlord-listings";
import { Listing } from "@/types/listing";

export default async function LandlordDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let listings: Listing[] = [];
  let listingsLoadError = false;
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

  const activeCount = countListingsByTab(listings).active;
  const addListingLocked = isAddListingLocked(status);

  // Compute whether in-place checklist will be shown instead of listings
  const checklistView = newListingPageView(status);
  const showInPlaceChecklist =
    listings.length === 0 && checklistView.show !== "form";

  return (
    <div className="w-full space-y-6">
      {/* Breadcrumb & Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          {/* Breadcrumb: Landlord / Listings */}
          <nav className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span>Landlord</span>
            <span>/</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              Listings
            </span>
          </nav>
          {/* Page Title */}
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
            Rental Listings
          </h1>
        </div>

        {/* Add Listing Button (Unlocked Link or Locked Popover Tooltip) */}
        <AddListingButton locked={addListingLocked} />
      </div>

      {/* Omit top VerificationBanner if checklist is already rendered in-place below */}
      {!showInPlaceChecklist && <VerificationBanner status={status} />}

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

      {/* Posted Listings Section (Persistent filter pills, search bar, and in-place checklist) */}
      <LandlordListingsView
        initialListings={listings}
        addListingLocked={addListingLocked}
        loadError={listingsLoadError}
        checklistView={showInPlaceChecklist ? checklistView : null}
      />
    </div>
  );
}
