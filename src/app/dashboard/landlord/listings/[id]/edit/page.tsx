import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandlordListingForm from "@/components/LandlordListingForm";
import { listingRowToFormValues } from "@/lib/validations/listing";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch existing listing from database for editing
  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("landlord_id", user.id)
    .single();

  if (error || !listing) {
    notFound();
  }

  // listingRowToFormValues passes the saved values through as they are
  // (null becomes undefined), so a listing with 0 available rooms opens
  // with 0. The form fills in its own defaults for empty columns (#231).
  return (
    <LandlordListingForm
      listingId={id}
      isEditing={true}
      initialValues={listingRowToFormValues(listing)}
    />
  );
}
