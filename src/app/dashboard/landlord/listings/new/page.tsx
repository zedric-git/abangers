import { redirect } from "next/navigation";
import LandlordListingForm from "@/components/LandlordListingForm";
import ListingChecklist from "@/components/ListingChecklist";
import { loadLandlordStatus } from "@/lib/auth/landlord-status";
import { newListingPageView } from "@/lib/landlord-status-view";
import { createClient } from "@/lib/supabase/server";

/**
 * Add New Listing. Only a landlord with a complete profile and a verified
 * account can post (#201), so the page checks first (#205) and shows the
 * form only then. Otherwise it shows the checklist of what's left, so
 * nobody fills in the whole form and uploads photos they can't publish.
 * That covers every way here: the buttons, a typed URL, the history.
 *
 * createListingAction checks again when the listing is published, and
 * the listings insert policy (0012) has the last word.
 */
export default async function NewListingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already sends signed-out users home; this is for a session
  // that ends between the two.
  if (!user) {
    redirect("/");
  }

  const landlordStatus = await loadLandlordStatus(supabase, user.id);
  const view = newListingPageView(landlordStatus);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, contact_number")
    .eq("id", user.id)
    .maybeSingle();

  return view.show === "form" ? (
    <LandlordListingForm
      defaultContactName={profile?.full_name ?? undefined}
      defaultContactPhone={profile?.contact_number ?? undefined}
    />
  ) : (
    <ListingChecklist view={view} />
  );
}
