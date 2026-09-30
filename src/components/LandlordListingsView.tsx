"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Search, Plus, ChevronDown } from "lucide-react";
import { Listing } from "@/types/listing";
import LandlordListingCard from "@/components/LandlordListingCard";

interface LandlordListingsViewProps {
  initialListings: Listing[];
}

export default function LandlordListingsView({
  initialListings,
}: LandlordListingsViewProps) {
  const [filter, setFilter] = useState("all");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          My Posted Listings
        </h2>
      </div>

      {initialListings.length > 0 ? (
        <>
          {/* Controls */}
          <div className="flex flex-col gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              {["All", "Active", "Occupied"].map((tab) => {
                const isActive = filter === tab.toLowerCase();
                return (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab.toLowerCase())}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-[#18181b] dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Search and Sort */}
            <div className="flex w-full items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search listings..."
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-white py-1 pr-3 pl-9 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:outline-none dark:border-zinc-800 dark:bg-[#18181b] dark:focus-visible:ring-zinc-300"
                />
              </div>
              <div className="relative shrink-0">
                <select
                  defaultValue=""
                  className="h-9 w-[100px] cursor-pointer appearance-none rounded-md border border-zinc-200 bg-white pr-8 pl-3 text-sm font-medium shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:outline-none dark:border-zinc-800 dark:bg-[#18181b] dark:focus-visible:ring-zinc-300"
                >
                  <option value="" disabled hidden>
                    Sort
                  </option>
                  <option value="updated">Recently Updated</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="views">Most Views</option>
                  <option value="inquiries">Most Inquiries</option>
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              </div>
            </div>
          </div>

          {/* List View */}
          <div className="flex flex-col gap-4">
            {initialListings.map((listing) => (
              <LandlordListingCard key={listing.id} listing={listing} />
            ))}
          </div>
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
  );
}
