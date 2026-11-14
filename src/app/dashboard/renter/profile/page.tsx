import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RenterProfileForm from "@/components/RenterProfileForm";

export default async function RenterProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already sends signed-out users home; this is for a session
  // that ends between the two.
  if (!user) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <RenterProfileForm mode="edit" />
    </div>
  );
}
