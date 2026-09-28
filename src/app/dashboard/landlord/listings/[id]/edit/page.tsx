import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandlordListingForm from "@/components/LandlordListingForm";
import { ListingInput } from "@/lib/validations/listing";

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
    redirect("/login");
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

  const initialValues: Partial<ListingInput> = {
    title: listing.title || "",
    address: listing.address || "",
    city: listing.city || "",
    monthly_rent: listing.price || listing.monthly_rent || 3000,
    total_rooms: listing.total_rooms || 1,
    available_rooms: listing.available_rooms || 1,
    property_type: listing.property_type || "Boarding House",
    occupancy_type: listing.occupancy_type || "Bedspace",
    allowed_gender: listing.allowed_gender || "Any / Co-ed",
    amenities: listing.amenities || [],
    utilities: listing.utilities || [],
    room_features: listing.room_features || [],
    bathroom_features: listing.bathroom_features || [],
    kitchen_features: listing.kitchen_features || [],
    laundry_features: listing.laundry_features || [],
    safety_features: listing.safety_features || [],
    description: listing.description || "",
    house_rules: listing.house_rules || "",
    contact_info: listing.contact_info || "",
    availability_status: listing.availability_status || "available",
    images: listing.images || [],
    cover_image: listing.cover_image || "",
  };

  return (
    <LandlordListingForm
      listingId={id}
      isEditing={true}
      initialValues={initialValues}
    />
  );
}
