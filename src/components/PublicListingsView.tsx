"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  SearchX,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ListingPreview } from "@/types/listing";
import {
  filterListings,
  hasActiveAttributeFilters,
  countActiveAttributeFilters,
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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const handleRequireAuth = (listing: ListingPreview) => {
    setSelectedListing(listing);
    setIsAuthModalOpen(true);
  };
  const searchParams = useSearchParams();
  const filters = parseListingFilterParams(searchParams);
  const activeFilterCount = countActiveAttributeFilters(filters);

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
      <div className="mx-auto max-w-4xl text-center sm:max-w-5xl">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 shadow-2xs dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300">
          <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
          <span>Verified Boarding Houses & Rooms in Cebu</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl lg:text-4xl dark:text-zinc-50">
          Find Your Next Home in{" "}
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Cebu
          </span>
        </h1>
        <p className="mx-auto mt-1 max-w-xl text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
          Search boarding houses, bedspaces, and rooms near your university or
          workplace.
        </p>

        {/* Search Input Bar with Filter Button beside Search */}
        <div className="mt-3.5 sm:mt-4">
          <ListingSearchBar
            value={filters.q}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            filterButton={
              <button
                type="button"
                onClick={() => setIsFiltersOpen((prev) => !prev)}
                className={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-2xl border px-3.5 text-xs font-semibold shadow-2xs transition-all sm:h-12 sm:px-4 sm:text-sm ${
                  isFiltersOpen
                    ? "border-purple-600 bg-purple-600 text-white shadow-xs"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-purple-300 hover:bg-purple-50/70 hover:text-purple-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-purple-800 dark:hover:bg-purple-950/20"
                }`}
                aria-expanded={isFiltersOpen}
                aria-controls="filters-expanded-panel"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span
                    className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                      isFiltersOpen
                        ? "bg-white text-purple-700"
                        : "bg-purple-600 text-white"
                    }`}
                  >
                    {activeFilterCount}
                  </span>
                )}
                {isFiltersOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                )}
              </button>
            }
          />
        </div>

        {/* Collapsible Property Attribute Filters Toolbar */}
        <div className="text-left">
          <ListingFilterControls
            filters={filters}
            isOpen={isFiltersOpen}
            onToggleOpen={() => setIsFiltersOpen((prev) => !prev)}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            hideToggleButton
          />
        </div>
      </div>

      {/* Results Counter & Active Query Feedback */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3 sm:mt-5 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 sm:text-base dark:text-zinc-100">
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
      <div className="mt-4 sm:mt-5">
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
