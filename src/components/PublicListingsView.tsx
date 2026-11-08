"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchX, Sparkles } from "lucide-react";
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
import LandlordAuthModal from "@/components/LandlordAuthModal";

interface PublicListingsViewProps {
  initialListings: ListingPreview[];
  isAuthenticated?: boolean;
}

/**
 * Interactive public listings view with search and property attribute filters (S2-04, S2-05, #14, #15).
 *
 * Performs instant in-memory filtering across preloaded public listings,
 * syncing query and filter parameters in the URL via the native History API
 * without triggering Next.js server re-fetches.
 * Back/Forward buttons cleanly restore the exact active search and filter state.
 */
export default function PublicListingsView({
  initialListings,
  isAuthenticated = false,
}: PublicListingsViewProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ListingPreview | null>(
    null,
  );

  const handleRequireAuth = (listing: ListingPreview) => {
    setSelectedListing(listing);
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
    if (next.min_rent !== undefined)
      params.set("min_rent", String(next.min_rent));
    if (next.max_rent !== undefined)
      params.set("max_rent", String(next.max_rent));
    if (next.property_type) params.set("property_type", next.property_type);
    if (next.occupancy) params.set("occupancy", next.occupancy);
    if (next.gender) params.set("gender", next.gender);
    if (next.near) params.set("near", next.near);
    if (next.distance) params.set("distance", next.distance);
    if (next.parking) params.set("parking", "true");
    if (next.utilities && next.utilities.length > 0) {
      params.set("utilities", next.utilities.join(","));
    }
    if (next.room_features && next.room_features.length > 0) {
      params.set("room_features", next.room_features.join(","));
    }
    if (next.bathroom && next.bathroom.length > 0) {
      params.set("bathroom", next.bathroom.join(","));
    }
    if (next.kitchen && next.kitchen.length > 0) {
      params.set("kitchen", next.kitchen.join(","));
    }
    if (next.laundry && next.laundry.length > 0) {
      params.set("laundry", next.laundry.join(","));
    }
    if (next.safety && next.safety.length > 0) {
      params.set("safety", next.safety.join(","));
    }
    if (next.house_rules && next.house_rules.length > 0) {
      params.set("house_rules", next.house_rules.join(","));
    }

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
      min_rent: undefined,
      max_rent: undefined,
      property_type: undefined,
      occupancy: undefined,
      gender: undefined,
      near: undefined,
      distance: undefined,
      parking: undefined,
      utilities: undefined,
      room_features: undefined,
      bathroom: undefined,
      kitchen: undefined,
      laundry: undefined,
      safety: undefined,
      house_rules: undefined,
    });
  };

  const handleClearAll = () => {
    updateUrl({
      q: "",
      min_rent: undefined,
      max_rent: undefined,
      property_type: undefined,
      occupancy: undefined,
      gender: undefined,
      near: undefined,
      distance: undefined,
      parking: undefined,
      utilities: undefined,
      room_features: undefined,
      bathroom: undefined,
      kitchen: undefined,
      laundry: undefined,
      safety: undefined,
      house_rules: undefined,
    });
  };

  const hasSearch = Boolean(filters.q);
  const hasFilters = hasActiveAttributeFilters(filters);
  const hasAnyFilterOrSearch = hasSearch || hasFilters;

  return (
    <>
      {/* Hero, Search & Filters Section */}
      <div className="mx-auto max-w-5xl pt-2 pb-6 text-center sm:pt-4 sm:pb-8 lg:max-w-6xl">
        <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-semibold text-purple-700 shadow-2xs dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300">
          <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <span>Verified Boarding Houses & Rooms in Cebu</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl dark:text-zinc-50">
          Find Your Next Home in{" "}
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Cebu
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
          Search boarding houses, bedspaces, and rooms near your university or
          workplace.
        </p>

        {/* Search Input Bar */}
        <div className="mt-8">
          <ListingSearchBar
            value={filters.q}
            onSearch={handleSearch}
            onClear={handleClearSearch}
          />
        </div>

        {/* Core Property Attribute Filters Toolbar */}
        <div className="mt-5 text-left">
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
                onRequireAuth={isAuthenticated ? undefined : handleRequireAuth}
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

      {/* Guest Login/Sign-up Modal (#86) */}
      <LandlordAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setSelectedListing(null);
        }}
        initialMode="signup"
        initialRole="renter"
        promptTitle="Create an account to view details"
        promptDescription={
          selectedListing
            ? `Sign up or log in to view full photos, rules, and contact information for "${selectedListing.title}".`
            : "Sign up or log in to view complete listing details, photos, and landlord contact information."
        }
        redirectTo={
          selectedListing ? `/listings/${selectedListing.id}` : undefined
        }
      />
    </>
  );
}
