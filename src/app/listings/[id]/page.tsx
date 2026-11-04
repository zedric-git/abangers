import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ListingDetailView from "@/components/ListingDetailView";
import {
  LISTING_LOAD_ERROR_MESSAGE,
  lookupListing,
} from "@/lib/listing-lookup";
import { listingRowToFormValues } from "@/lib/validations/listing";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // maybeSingle, not single: "no such listing" is no row, not an error, so
  // it can't be mixed up with a query that failed (#244).
  const lookup = lookupListing(
    await supabase.from("listings").select("*").eq("id", id).maybeSingle(),
  );

  // Deleted, or the id in the URL is wrong: send the visitor home rather
  // than show a 404 page. Point this at the public listings page
  // (/listings) once it's built (Sprint 2, #93).
  if (lookup.kind === "missing") {
    redirect("/");
  }

  if (lookup.kind === "failed") {
    console.error("Error fetching listing:", lookup.error);
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8 dark:bg-black">
        <div className="mx-auto max-w-4xl">
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

  const { listing } = lookup;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8 dark:bg-black">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Back Link */}
        <Link
          href="/listings"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Listings
        </Link>

        {/* Reusable Public Listing Detail View */}
        <ListingDetailView listing={listingRowToFormValues(listing)} />
      </div>
    </div>
  );
}
