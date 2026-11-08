import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowLeft, Building } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ListingDetailView from "@/components/ListingDetailView";
import SignedInOnly from "@/components/SignedInOnly";
import { LISTING_LOAD_ERROR_MESSAGE } from "@/lib/listing-lookup";
import {
  fetchListingById,
  MISSING_PUBLIC_LISTING_REDIRECT_PATH,
} from "@/lib/fetch-listing";

export default async function ListingDetailPage({
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

  const lookup = await fetchListingById(supabase, id);

  // Deleted or mistyped id in the URL: back to /listings with a notice
  // instead of a 404 page (#244, #94).
  if (lookup.kind === "missing") {
    redirect(MISSING_PUBLIC_LISTING_REDIRECT_PATH);
  }

  const backLink = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Link
          href="/listings"
          className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Listings
        </Link>
        {lookup.kind === "found" && (
          <>
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <span className="truncate font-semibold text-purple-600 dark:text-purple-400">
              {lookup.listing.title}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Link
          href="/listings"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900 sm:text-sm dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Listings
        </Link>
      </div>
    </div>
  );

  // The query failed: the listing may well be there, so don't say it isn't.
  if (lookup.kind === "failed") {
    console.error("Error fetching listing:", lookup.error);
    return (
      <div className="bg-background min-h-dvh px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <SignedInOnly />
        <div className="mx-auto max-w-6xl space-y-6">
          {backLink}
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{LISTING_LOAD_ERROR_MESSAGE}</p>
          </div>
        </div>
      </div>
    );
  }

  const { listing, formValues } = lookup;
  const subtitle = [
    listing.property_type,
    listing.occupancy_type,
    listing.allowed_gender,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="bg-background min-h-dvh px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Signed out (e.g. Back after logging out) → home page (#252) */}
      <SignedInOnly />

      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top Header & Navigation */}
        {backLink}

        {/* Property Overview Banner */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/95 p-4 shadow-xs backdrop-blur-md sm:p-5 dark:border-purple-900/50 dark:bg-purple-950/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-700 text-white dark:bg-purple-600">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-purple-950 dark:text-purple-100">
                {listing.title}
              </h2>
              {subtitle && (
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Reusable Listing Detail View (#93) */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <ListingDetailView listing={formValues} />
        </div>
      </div>
    </div>
  );
}
