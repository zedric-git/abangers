import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ListingDetailView from "@/components/ListingDetailView";

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
    redirect("/login");
  }

  // Fetch listing by ID scoped to authenticated landlord
  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("landlord_id", user.id)
    .single();

  if (error || !listing) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/dashboard/landlord/listings"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900 sm:text-sm dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Listings
        </Link>
      </div>

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
        <ListingDetailView listing={listing} />
      </div>
    </div>
  );
}
