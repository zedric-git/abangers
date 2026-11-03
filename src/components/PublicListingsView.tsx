"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchX } from "lucide-react";
import type { Listing } from "@/types/listing";
import { filterListings } from "@/lib/search-listings";
import ListingSearchBar from "@/components/ListingSearchBar";
import PublicListingCard from "@/components/PublicListingCard";

interface PublicListingsViewProps {
  initialListings: Listing[];
  initialQuery?: string;
}

/**
 * Interactive public listings view (S2-04, #87, #88).
 *
 * Performs instant in-memory filtering across the preloaded public listings,
 * while keeping the URL query parameter `?q=` in sync in the background.
 */
export default function PublicListingsView({
  initialListings,
  initialQuery = "",
}: PublicListingsViewProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [, startTransition] = useTransition();

  // Instant in-memory keyword matching (0ms latency)
  const visibleListings = filterListings(initialListings, query);

  const handleSearch = (newTerm: string) => {
    const trimmed = newTerm.trim();
    setQuery(trimmed);

    // Sync URL in the background without blocking the UI
    startTransition(() => {
      const url = trimmed
        ? `/listings?q=${encodeURIComponent(trimmed)}`
        : "/listings";
      router.replace(url, { scroll: false });
    });
  };

  const handleClear = () => {
    handleSearch("");
  };

  return (
    <>
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
          <ListingSearchBar
            value={query}
            onSearch={handleSearch}
            onClear={handleClear}
          />
        </div>
      </div>

      {/* Results Counter & Active Query Feedback */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {query ? (
              <>
                Showing {visibleListings.length}{" "}
                {visibleListings.length === 1 ? "result" : "results"} for{" "}
                <span className="text-purple-600 dark:text-purple-400">
                  &ldquo;{query}&rdquo;
                </span>
              </>
            ) : (
              `Available Listings (${visibleListings.length})`
            )}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {query
              ? "Matching title, location, university, or description keywords."
              : "Browse all available rooms and boarding houses."}
          </p>
        </div>

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="cursor-pointer text-xs font-semibold text-purple-600 transition-colors hover:text-purple-700 hover:underline dark:text-purple-400 dark:hover:text-purple-300"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Listings Grid or Empty State */}
      <div className="mt-8">
        {visibleListings.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
            {visibleListings.map((listing) => (
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
              &rdquo;. Try searching for a different city, school, or landmark.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-purple-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-purple-700 active:bg-purple-800"
              >
                View all listings
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
