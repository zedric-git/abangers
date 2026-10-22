import { redirect } from "next/navigation";
import LandlordProfileForm from "@/components/LandlordProfileForm";
import { loadLandlordStatus } from "@/lib/auth/landlord-status";
import { createClient } from "@/lib/supabase/server";

export default async function LandlordProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already sends signed-out users home; this is for a session
  // that ends between the two.
  if (!user) {
    redirect("/");
  }

  // Where the landlord stands (#205), read on the server so the badge,
  // the banner and the name lock are right from the start. The form still
  // loads the profile's fields itself.
  const status = await loadLandlordStatus(supabase, user.id);

  return <LandlordProfileForm status={status} />;
}
