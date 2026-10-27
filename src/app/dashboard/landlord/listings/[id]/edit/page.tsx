import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import LandlordListingForm from "@/components/LandlordListingForm";
import {
  LISTING_LOAD_ERROR_MESSAGE,
  lookupListing,
  MISSING_LISTING_REDIRECT_PATH,
} from "@/lib/listing-lookup";
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

  // Fetch existing listing from database for editing. maybeSingle, not
  // single: "no such listing" is no row, not an error, so it can't be
  // mixed up with a query that failed (#244).
  const lookup = lookupListing(
    await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .eq("landlord_id", user.id)
      .maybeSingle(),
  );

  // Deleted, another landlord's, or the id in the URL is wrong: back to My
  // Posted Listings, with a note saying why, instead of a 404 page.
  if (lookup.kind === "missing") {
    redirect(MISSING_LISTING_REDIRECT_PATH);
  }

  // The query failed: the listing may well be there, so don't say it
  // isn't, and don't open an empty form that could be saved over it.
  if (lookup.kind === "failed") {
    console.error("Error fetching listing:", lookup.error);
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/dashboard/landlord"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900 sm:text-sm dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{LISTING_LOAD_ERROR_MESSAGE}</p>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, contact_number")
    .eq("id", user.id)
    .maybeSingle();

  // listingRowToFormValues passes the saved values through as they are
  // (null becomes undefined), so a listing with 0 available rooms opens
  // with 0. The form fills in its own defaults for empty columns (#231).
  return (
    <LandlordListingForm
      listingId={id}
      isEditing={true}
      initialValues={listingRowToFormValues(lookup.listing)}
      defaultContactName={profile?.full_name ?? undefined}
      defaultContactPhone={profile?.contact_number ?? undefined}
    />
  );
}
