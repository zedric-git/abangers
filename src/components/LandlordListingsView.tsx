"use client";

import { useState } from "react";
import { AlertCircle, Building2, Search } from "lucide-react";
import { Listing } from "@/types/listing";
import AddListingButton from "@/components/AddListingButton";
import LandlordListingCard from "@/components/LandlordListingCard";
import {
  countListingsByTab,
  filterLandlordListings,
  LISTINGS_TABS,
  type ListingsTab,
} from "@/lib/filter-landlord-listings";

interface LandlordListingsViewProps {
  initialListings: Listing[];
  /** The landlord can't post yet, so "Create First Listing" shows a lock (#205). */
  addListingLocked: boolean;
  /** The listings couldn't be read, so say that instead of "No listings created yet". */
  loadError?: boolean;
}

export default function LandlordListingsView({
  initialListings,
  addListingLocked,
  loadError = false,
}: LandlordListingsViewProps) {
  // The toolbar (#232): the tab and the search filter the listings the
  // page already loaded (see filter-landlord-listings.ts).
  const [tab, setTab] = useState<ListingsTab>("all");
  const [search, setSearch] = useState("");

  const tabCounts = countListingsByTab(initialListings);
  const visibleListings = filterLandlordListings(initialListings, {
    tab,
    search,
  });

  const clearFilters = () => {
    setTab("all");
    setSearch("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          My Posted Listings
        </h2>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            We couldn&apos;t load your listings. Refresh the page to try again.
          </p>
        </div>
      ) : initialListings.length > 0 ? (
        <>
          {/* Controls */}
          <div className="flex flex-col gap-3">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {LISTINGS_TABS.map(({ value, label }) => {
                const isActive = tab === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setTab(value)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-[#18181b] dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {label} ({tabCounts[value]})
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative w-full">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search listings by title, address or city"
                placeholder="Search by title, address or city..."
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white py-1 pr-3 pl-9 text-sm text-zinc-900 shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:outline-none dark:border-zinc-800 dark:bg-[#18181b] dark:text-zinc-100 dark:focus-visible:ring-zinc-300"
              />
            </div>
          </div>

          {/* List View */}
          {visibleListings.length > 0 ? (
            <div className="flex flex-col gap-4">
              {visibleListings.map((listing) => (
                <LandlordListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                No listings match
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                Try another search or tab.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-[#1f1f22] dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Clear filters
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400">
            <Building2 className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
            No listings created yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            Get started by posting your first boarding house or rental property
            to reach renters.
          </p>
          <div className="mt-5">
            <AddListingButton
              locked={addListingLocked}
              label="Create First Listing"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-purple-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700"
            />
          </div>
        </div>
      )}
    </div>
  );
}
