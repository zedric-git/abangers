import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Building2, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import LandlordListingCard from "@/components/LandlordListingCard";
import { Listing } from "@/types/listing";

export default async function LandlordListingsPage() {
  const supabase = await createClient();

  // Get current logged in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch listings created by this landlord (RLS + explicit landlord_id query)
  const { data: rawListings, error } = await supabase
    .from("listings")
    .select("*")
    .eq("landlord_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching landlord listings:", error);
  }

  const listings = (rawListings || []) as Listing[];

  // Compute status summary counts
  const totalListings = listings.length;
  const availableCount = listings.filter(
    (item) => item.availability_status === "available",
  ).length;
  const occupiedCount = listings.filter(
    (item) =>
      item.availability_status === "fully_occupied" ||
      item.availability_status === "unavailable" ||
      item.availability_status === "occupied",
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
            My Posted Listings
          </h1>
          <p className="mt-1 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
            Manage your rental properties, monitor room availability, and update
            listing details.
          </p>
        </div>

        <Link
          href="/dashboard/landlord/listings/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          Add New Listing
        </Link>
      </div>

      {/* Quick Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Total Listings
            </p>
            <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {totalListings}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Available
            </p>
            <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {availableCount}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Fully Occupied
            </p>
            <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {occupiedCount}
            </p>
          </div>
        </div>
      </div>

      {/* Listings Grid / Empty State */}
      {listings.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <LandlordListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400">
            <Building2 className="h-8 w-8" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            No properties posted yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
            You haven&apos;t published any boarding house or room rental
            listings yet. Post your first property to start receiving renter
            inquiries.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/landlord/listings/new"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-purple-700 px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Post Your First Listing
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
