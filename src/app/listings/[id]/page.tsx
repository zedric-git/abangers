import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ListingDetailView from "@/components/ListingDetailView";
import SignedInOnly from "@/components/SignedInOnly";
import {
  LISTING_LOAD_ERROR_MESSAGE,
  lookupListing,
  MISSING_PUBLIC_LISTING_REDIRECT_PATH,
} from "@/lib/listing-lookup";
import { listingRowToFormValues } from "@/lib/validations/listing";
import type { Listing } from "@/types/listing";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "renter") {
    redirect(`/dashboard/renter/listings/${id}`);
  }

  const lookup = lookupListing<Listing>(
    await supabase.from("listings").select("*").eq("id", id).maybeSingle(),
  );

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

  const listing = lookup.listing;
  const formValues = listingRowToFormValues(listing);

  return (
    <div className="bg-background min-h-dvh px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Signed out (e.g. Back after logging out) → home page (#252) */}
      <SignedInOnly />

      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top Header & Navigation */}
        {backLink}

        {/* Reusable Listing Detail View (#93) */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <ListingDetailView listing={formValues} audience="renter" />
        </div>
      </div>
    </div>
  );
}
