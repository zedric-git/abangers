import Link from "next/link";
import { Plus, Building2, Eye, MessageSquare, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import LandlordListingCard from "@/components/LandlordListingCard";
import { Listing } from "@/types/listing";

export default async function LandlordDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let listings: Listing[] = [];

  if (user) {
    const { data: rawListings } = await supabase
      .from("listings")
      .select("*")
      .eq("landlord_id", user.id)
      .order("created_at", { ascending: false });

    listings = (rawListings || []) as Listing[];
  }

  const activeCount = listings.length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">
            Landlord Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your rental listings, monitor inquiries, and update property
            details.
          </p>
        </div>

        <Link
          href="/dashboard/landlord/listings/new"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-purple-700 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          Add New Listing
        </Link>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Active Listings
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {activeCount}
            </span>
            <span className="ml-2 text-xs text-zinc-400">
              properties listed
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Total Inquiries
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              0
            </span>
            <span className="ml-2 text-xs text-zinc-400">renter messages</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Total Views
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Eye className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              0
            </span>
            <span className="ml-2 text-xs text-zinc-400">views this month</span>
          </div>
        </div>
      </div>

      {/* Posted Listings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            My Posted Listings
          </h2>
          {listings.length > 0 && (
            <Link
              href="/dashboard/landlord/listings"
              className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 transition-colors hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
            >
              View all listings ({listings.length})
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <LandlordListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400">
              <Building2 className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
              No listings created yet
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              Get started by posting your first boarding house or rental
              property to reach renters.
            </p>
            <div className="mt-5">
              <Link
                href="/dashboard/landlord/listings/new"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-purple-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700"
              >
                <Plus className="h-4 w-4" />
                Create First Listing
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
