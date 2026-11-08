"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";
import type { ListingPreview } from "@/types/listing";
import {
  filterListings,
  hasActiveAttributeFilters,
} from "@/lib/filter-listings";
import {
  parseListingFilterParams,
  type ListingFilterParams,
} from "@/lib/validations/listing-filters";
import ListingSearchBar from "@/components/ListingSearchBar";
import ListingFilterControls from "@/components/ListingFilterControls";
import PublicListingCard from "@/components/PublicListingCard";
import FavoriteButton from "@/components/FavoriteButton";
import LandlordAuthModal from "@/components/LandlordAuthModal";

interface PublicListingsViewProps {
  initialListings: ListingPreview[];
  userRole?: string | null;
  favoritedListingIds?: string[];
}

/**
 * Interactive public listings view with search and core property attribute filters (S2-04, S2-05, #14, #15).
 *
 * Performs instant in-memory filtering across preloaded public listings,
 * syncing query and filter parameters in the URL via the native History API
 * without triggering Next.js server re-fetches.
 * Back/Forward buttons cleanly restore the exact active search and filter state.
 */
export default function PublicListingsView({
  initialListings,
  userRole = null,
  favoritedListingIds = [],
}: PublicListingsViewProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const savedSet = new Set(favoritedListingIds);

  const handleRequireAuth = () => {
    setIsAuthModalOpen(true);
  };
  const searchParams = useSearchParams();
  const filters = parseListingFilterParams(searchParams);

  // Instant in-memory filtering (0ms latency)
  const visibleListings = filterListings(initialListings, filters);

  const updateUrl = (updated: Partial<ListingFilterParams>) => {
    const next: ListingFilterParams = {
      ...filters,
      ...updated,
    };

    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.max_rent !== undefined) {
      params.set("max_rent", String(next.max_rent));
    }
    if (next.property_type) params.set("property_type", next.property_type);
    if (next.occupancy) params.set("occupancy", next.occupancy);
    if (next.gender) params.set("gender", next.gender);

    const queryString = params.toString();
    const url = queryString ? `/listings?${queryString}` : "/listings";
    window.history.replaceState(null, "", url);
  };

  const handleSearch = (newTerm: string) => {
    updateUrl({ q: newTerm.trim() });
  };

  const handleClearSearch = () => {
    updateUrl({ q: "" });
  };

  const handleFilterChange = <K extends keyof ListingFilterParams>(
    key: K,
    value: ListingFilterParams[K] | undefined,
  ) => {
    updateUrl({ [key]: value });
  };

  const handleResetFilters = () => {
    updateUrl({
      max_rent: undefined,
      property_type: undefined,
      occupancy: undefined,
      gender: undefined,
    });
  };

  const handleClearAll = () => {
    updateUrl({
      q: "",
      max_rent: undefined,
      property_type: undefined,
      occupancy: undefined,
      gender: undefined,
    });
  };

  const hasSearch = Boolean(filters.q);
  const hasFilters = hasActiveAttributeFilters(filters);
  const hasAnyFilterOrSearch = hasSearch || hasFilters;

  return (
    <>
      {/* Hero, Search & Filters Section */}
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
          Find Your Next Home in Cebu
        </h1>
        <p className="mt-2 text-sm text-zinc-500 sm:text-base dark:text-zinc-400">
          Search boarding houses, bedspaces, and rooms near your university or
          workplace.
        </p>

        {/* Search Input Bar */}
        <div className="mt-6">
          <ListingSearchBar
            value={filters.q}
            onSearch={handleSearch}
            onClear={handleClearSearch}
          />
        </div>

        {/* Core Property Attribute Filters Toolbar */}
        <div className="mt-4 text-left">
          <ListingFilterControls
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
          />
        </div>
      </div>

      {/* Results Counter & Active Query Feedback */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {hasAnyFilterOrSearch ? (
              <>
                Showing {visibleListings.length}{" "}
                {visibleListings.length === 1 ? "result" : "results"}
                {filters.q && (
                  <>
                    {" "}
                    for{" "}
                    <span className="text-purple-600 dark:text-purple-400">
                      &ldquo;{filters.q}&rdquo;
                    </span>
                  </>
                )}
              </>
            ) : (
              `Available Listings (${visibleListings.length})`
            )}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {hasSearch && hasFilters
              ? "Matching your active search keywords and property filters."
              : hasSearch
                ? "Matching your search keywords."
                : hasFilters
                  ? "Matching your active property filters."
                  : "Browse all available rooms and boarding houses."}
          </p>
        </div>

        {hasAnyFilterOrSearch && (
          <button
            type="button"
            onClick={handleClearAll}
            className="cursor-pointer text-xs font-semibold text-purple-600 transition-colors hover:text-purple-700 hover:underline dark:text-purple-400 dark:hover:text-purple-300"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Listings Grid or Empty State */}
      <div className="mt-8">
        {visibleListings.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
            {visibleListings.map((listing) => (
              <PublicListingCard
                key={listing.id}
                listing={listing}
                action={
                  <FavoriteButton
                    listingId={listing.id}
                    initialFavorited={savedSet.has(listing.id)}
                    userRole={userRole}
                    onRequireAuth={handleRequireAuth}
                  />
                }
              />
            ))}
          </div>
        ) : hasAnyFilterOrSearch ? (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
              <SearchX className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
              No listings found
            </h3>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              We couldn&apos;t find any properties matching your selected
              filters. Try adjusting your budget, property type, or search term.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-purple-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-purple-700 active:bg-purple-800"
              >
                Reset search & filters
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
              <SearchX className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
              No listings yet
            </h3>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              There are currently no available boarding houses or rooms listed.
              Please check back soon!
            </p>
          </div>
        )}
      </div>

      {/* Guest Login/Sign-up Modal (#86 & #96) */}
      {isAuthModalOpen && (
        <LandlordAuthModal
          isOpen
          onClose={() => setIsAuthModalOpen(false)}
          initialMode="signup"
          initialRole="renter"
        />
      )}
    </>
  );
}
