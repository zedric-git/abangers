import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowLeft, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ListingDetailView from "@/components/ListingDetailView";
import {
  LISTING_LOAD_ERROR_MESSAGE,
  lookupListing,
  MISSING_LISTING_REDIRECT_PATH,
} from "@/lib/listing-lookup";
import { listingRowToFormValues } from "@/lib/validations/listing";

export default async function LandlordListingDetailPage({
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

  // Fetch listing by ID scoped to authenticated landlord. maybeSingle, not
  // single: "no such listing" is no row, not an error, so it can't be mixed
  // up with a query that failed (#244).
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

  const backLink = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href="/dashboard/landlord"
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900 sm:text-sm dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
    </div>
  );

  // The query failed: the listing may well be there, so don't say it isn't.
  if (lookup.kind === "failed") {
    console.error("Error fetching listing:", lookup.error);
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        {backLink}
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

  const { listing } = lookup;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Header & Navigation */}
      {backLink}

      {/* Preview Info Banner (Pure preview view, no edit/publish action buttons) */}
      <div className="rounded-2xl border border-purple-200 bg-purple-50/95 p-4 shadow-xs backdrop-blur-md sm:p-5 dark:border-purple-900/50 dark:bg-purple-950/90">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-700 text-white dark:bg-purple-600">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-purple-950 dark:text-purple-100">
              Listing Preview Mode
            </h2>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Viewing property details exactly as renters will see them.
            </p>
          </div>
        </div>
      </div>

      {/* Reusable Public Listing Detail View */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <ListingDetailView listing={listingRowToFormValues(listing)} />
      </div>
    </div>
  );
}
