import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PublicListingsView from "@/components/PublicListingsView";
import { PUBLIC_LISTING_COLUMNS } from "@/app/listings/page";
import type { ListingPreview } from "@/types/listing";
import { parseListingFilterParams } from "@/lib/validations/listing-filters";

export const dynamic = "force-dynamic";

interface RenterDashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RenterDashboardPage({
  searchParams,
}: RenterDashboardPageProps) {
  const resolvedParams = await searchParams;
  const initialFilters = parseListingFilterParams(resolvedParams);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: favRows }, { data: rows, error }] = await Promise.all([
    user
      ? supabase.from("favorites").select("listing_id").eq("renter_id", user.id)
      : Promise.resolve({ data: [] }),
    supabase
      .from("listings")
      .select(PUBLIC_LISTING_COLUMNS)
      .eq("availability_status", "available")
      .order("created_at", { ascending: false }),
  ]);

  const favoritedIds = (favRows ?? []).map((r) => r.listing_id);
  const listings: ListingPreview[] = rows ?? [];

  if (error) {
    return (
      <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center dark:border-rose-900/60 dark:bg-rose-950/30">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-bold text-rose-950 dark:text-rose-100">
          Unable to load listings right now
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-rose-700 sm:text-sm dark:text-rose-300">
          We ran into a temporary problem reaching the database. Please refresh
          the page or try again in a moment.
        </p>
        <div className="mt-5">
          <Link
            href="/dashboard/renter"
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-rose-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PublicListingsView
      listings={listings}
      initialFilters={initialFilters}
      favoritedIds={favoritedIds}
      userRole="renter"
      isAuthenticated={Boolean(user)}
      variant="dashboard"
    />
  );
}
