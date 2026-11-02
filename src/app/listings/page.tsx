import { Suspense } from "react";
import Link from "next/link";
import { AlertCircle, Home, SearchX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { filterListings, parseSearchQuery } from "@/lib/search-listings";
import ListingSearchBar from "@/components/ListingSearchBar";
import PublicListingCard from "@/components/PublicListingCard";

interface ListingsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const metadata = {
  title: "Browse Listings | Abangers",
  description:
    "Search boarding houses, bedspaces, and apartments for rent near universities and workplaces in Cebu.",
};

export default async function ListingsPage({
  searchParams,
}: ListingsPageProps) {
  const resolvedParams = await searchParams;
  const query = parseSearchQuery(resolvedParams);

  const supabase = await createClient();

  const { data: rawListings, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load listings:", error);
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
        <div className="mx-auto max-w-5xl">
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="font-semibold">Unable to load listings</h2>
              <p className="mt-1">
                We couldn&apos;t load listings right now. Please refresh the
                page or try again in a few moments.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const listings = filterListings(rawListings ?? [], query);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      {/* Top Header / Navigation */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
              <Home className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Abangers
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Hero / Search Section */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
            Find Your Next Home in Cebu
          </h1>
          <p className="mt-2 text-sm text-zinc-500 sm:text-base dark:text-zinc-400">
            Search boarding houses, bedspaces, and rooms near your university or
            workplace.
          </p>

          <div className="mt-6">
            <Suspense
              fallback={
                <div className="h-12 w-full animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
              }
            >
              <ListingSearchBar key={query} />
            </Suspense>
          </div>
        </div>

        {/* Results Counter & Active Query Feedback */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {query ? (
                <>
                  Showing {listings.length}{" "}
                  {listings.length === 1 ? "result" : "results"} for{" "}
                  <span className="text-purple-600 dark:text-purple-400">
                    &ldquo;{query}&rdquo;
                  </span>
                </>
              ) : (
                `Available Listings (${listings.length})`
              )}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {query
                ? "Matching title, location, university, or description keywords."
                : "Browse all available rooms and boarding houses."}
            </p>
          </div>

          {query && (
            <Link
              href="/listings"
              className="inline-flex items-center text-xs font-semibold text-purple-600 transition-colors hover:text-purple-700 hover:underline dark:text-purple-400 dark:hover:text-purple-300"
            >
              Clear search
            </Link>
          )}
        </div>

        {/* Listings Grid or Empty State */}
        <div className="mt-8">
          {listings.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
              {listings.map((listing) => (
                <PublicListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                <SearchX className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
                No listings found
              </h3>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                We couldn&apos;t find any properties matching &ldquo;{query}
                &rdquo;. Try searching for a different city, school, or
                landmark.
              </p>
              <div className="mt-6">
                <Link
                  href="/listings"
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-purple-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-purple-700 active:bg-purple-800"
                >
                  View all listings
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
