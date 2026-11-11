import { redirect } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ListingDetailView from "@/components/ListingDetailView";
import RenterListingDetailHeader from "@/components/RenterListingDetailHeader";
import SignedInOnly from "@/components/SignedInOnly";
import {
  LISTING_LOAD_ERROR_MESSAGE,
  lookupListing,
} from "@/lib/listing-lookup";
import { listingRowToFormValues } from "@/lib/validations/listing";
import type { Listing } from "@/types/listing";

export const dynamic = "force-dynamic";

interface RenterListingDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RenterListingDetailPage({
  params,
  searchParams,
}: RenterListingDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const from =
    typeof resolvedSearchParams.from === "string"
      ? resolvedSearchParams.from
      : undefined;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Ensure user is a renter
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "landlord") {
    redirect("/dashboard/landlord");
  } else if (profile?.role === "admin") {
    redirect("/dashboard/admin");
  }

  // Fetch listing data
  const lookup = lookupListing<Listing>(
    await supabase.from("listings").select("*").eq("id", id).maybeSingle(),
  );

  if (lookup.kind === "missing") {
    redirect(
      from === "favorites"
        ? "/dashboard/renter/favorites"
        : "/dashboard/renter",
    );
  }

  if (lookup.kind === "failed") {
    console.error("Error fetching listing:", lookup.error);
    return (
      <div className="space-y-6">
        <SignedInOnly />
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{LISTING_LOAD_ERROR_MESSAGE}</p>
          </div>
          <div className="mt-4">
            <Link
              href={
                from === "favorites"
                  ? "/dashboard/renter/favorites"
                  : "/dashboard/renter"
              }
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Return
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const listing = lookup.listing;
  const formValues = listingRowToFormValues(listing);

  // Check if favorited
  const { data: favRow } = await supabase
    .from("favorites")
    .select("id")
    .eq("renter_id", user.id)
    .eq("listing_id", id)
    .maybeSingle();

  const isFavorited = Boolean(favRow);

  const subtitle = [
    listing.property_type,
    listing.occupancy_type,
    listing.allowed_gender,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="space-y-6 pb-12">
      <SignedInOnly />

      {/* Top Header Card & Callout (Matches Pic 1 prototype) */}
      <RenterListingDetailHeader
        listingId={listing.id}
        title={listing.title}
        subtitle={subtitle}
        initialFavorited={isFavorited}
        from={from}
        landlordContact={listing.contact_info}
      />

      {/* Reusable Listing Detail Specs & Photo Gallery */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <ListingDetailView listing={formValues} audience="renter" />
      </div>
    </div>
  );
}
