"use client";

import { useState } from "react";
import { AlertCircle, Building2, Lock, Search } from "lucide-react";
import { Listing } from "@/types/listing";
import AddListingButton from "@/components/AddListingButton";
import LandlordListingCard from "@/components/LandlordListingCard";
import ListingChecklist from "@/components/ListingChecklist";
import type { NewListingPageView } from "@/lib/landlord-status-view";
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
  /**
   * Show the "My Posted Listings" heading. The My Posted Listings page
   * turns it off, since its page title already says it (#239).
   */
  showHeading?: boolean;
  /** When unverified with 0 listings, render the checklist in-place */
  checklistView?: Exclude<NewListingPageView, { show: "form" }> | null;
  /** Whether the landlord account is verified. For unverified/pending accounts, filter pills are disabled and rendered in grey. */
  isVerified?: boolean;
}

export default function LandlordListingsView({
  initialListings,
  addListingLocked,
  loadError = false,
  showHeading = false,
  checklistView = null,
  isVerified = true,
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

  const currentTabObj =
    LISTINGS_TABS.find((t) => t.value === tab) ?? LISTINGS_TABS[0];

  const isFilterDisabled = !isVerified;

  return (
    <div className="space-y-4">
      {showHeading && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            My Posted Listings
          </h2>
        </div>
      )}

      {/* FILTER BY STATUS / METRIC & Search (Persistent Across ALL States) */}
      <div className="space-y-3">
        {/* Header & Viewing indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
            FILTER BY STATUS / METRIC
          </span>
          <span
            className={`text-xs font-semibold ${
              isFilterDisabled
                ? "text-zinc-400 dark:text-zinc-500"
                : "text-purple-600 dark:text-purple-400"
            }`}
          >
            Viewing: {currentTabObj.label} ({tabCounts[tab]})
          </span>
        </div>

        {/* 5 Pill Buttons spanning grid width */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {LISTINGS_TABS.map(({ value, label }) => {
            const isActive = !isFilterDisabled && tab === value;
            const count = tabCounts[value];

            let buttonStyle = "";
            let badgeStyle = "";

            if (isFilterDisabled) {
              buttonStyle =
                "border-2 border-zinc-200 bg-white text-zinc-400 cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500";
              badgeStyle =
                "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500";
            } else if (isActive) {
              buttonStyle = "bg-purple-600 text-white shadow-xs";
              badgeStyle = "bg-white text-purple-700";
            } else {
              buttonStyle =
                "border-2 border-purple-500/30 bg-white text-purple-700 hover:bg-purple-50 dark:border-purple-400/30 dark:bg-zinc-900 dark:text-purple-300 dark:hover:bg-purple-950/30";
              badgeStyle =
                "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300";
            }

            return (
              <button
                key={value}
                type="button"
                disabled={isFilterDisabled}
                aria-pressed={isActive}
                onClick={isFilterDisabled ? undefined : () => setTab(value)}
                className={`inline-flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all sm:justify-center ${buttonStyle}`}
              >
                <span className="truncate">{label}</span>
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold ${badgeStyle}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar Input */}
        <div className="relative w-full">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            type="search"
            value={search}
            disabled={isFilterDisabled}
            onChange={
              isFilterDisabled
                ? undefined
                : (event) => setSearch(event.target.value)
            }
            aria-label="Search listing titles, addresses, or prices..."
            placeholder="Search listing titles, addresses, or prices..."
            className={`flex h-11 w-full rounded-xl pl-10 text-sm shadow-xs transition-colors focus-visible:outline-none ${
              isFilterDisabled
                ? "cursor-not-allowed border-2 border-zinc-200 bg-white pr-10 text-zinc-400 shadow-none placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 dark:placeholder:text-zinc-600"
                : "border border-zinc-200 bg-white pr-4 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-purple-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:ring-purple-400"
            }`}
          />
          {isFilterDisabled && (
            <Lock className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          )}
        </div>
      </div>

      {/* Main Listing Area */}
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
      ) : initialListings.length === 0 && checklistView ? (
        /* In-place step-by-step checklist when unverified/pending with 0 listings */
        <div>
          <ListingChecklist view={checklistView} hideBackLink />
        </div>
      ) : initialListings.length === 0 ? (
        /* Verified landlord with 0 listings created yet */
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
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
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-purple-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
            />
          </div>
        </div>
      ) : visibleListings.length > 0 ? (
        /* Listing Cards */
        <div className="flex flex-col gap-4">
          {visibleListings.map((listing) => (
            <LandlordListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        /* Empty Filter / Search Result */
        <div className="rounded-3xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-10 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            No properties found in this filter.
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            Try selecting another filter status or clear your search term.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-purple-600 px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-700"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
