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

  const addListingLocked = isAddListingLocked(status);
  const isVerified = status?.verification === "verified";

  // Compute whether in-place checklist will be shown instead of listings
  const checklistView = newListingPageView(status);
  const showInPlaceChecklist =
    listings.length === 0 && checklistView.show !== "form";

  return (
    <div className="w-full space-y-4 sm:space-y-5">
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

      {/* Posted Listings Section (Persistent filter pills, search bar, and in-place checklist) */}
      <LandlordListingsView
        initialListings={listings}
        addListingLocked={addListingLocked}
        loadError={listingsLoadError}
        checklistView={showInPlaceChecklist ? checklistView : null}
        isVerified={isVerified}
      />
    </div>
  );
}
