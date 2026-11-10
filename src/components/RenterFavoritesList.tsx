"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Search, X } from "lucide-react";
import type { ListingPreview } from "@/types/listing";
import PublicListingCard from "@/components/PublicListingCard";
import FavoriteButton from "@/components/FavoriteButton";

interface RenterFavoritesListProps {
  initialListings: ListingPreview[];
}

/**
 * Interactive list view for a renter's saved favorites (S2-09.1 #98, S2-09.2 #99).
 *
 * Implements the prototype layout and visual hierarchy from .Abangers UI:
 * - Search bar to filter saved properties by title, address, or type
 * - Responsive 3-column card grid with occupied warnings and room left badges
 * - Instant removal upon un-favoriting with empty-state when no saved places remain
 */
export default function RenterFavoritesList({
  initialListings,
}: RenterFavoritesListProps) {
  const [listings, setListings] = useState<ListingPreview[]>(initialListings);
  const [searchQuery, setSearchQuery] = useState("");

  const handleToggle = (listing: ListingPreview, favorited: boolean) => {
    if (!favorited) {
      // Optimistically remove from saved list
      setListings((prev) => prev.filter((item) => item.id !== listing.id));
    }
  };

  const filteredListings = listings.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.title.toLowerCase().includes(q) ||
      item.address.toLowerCase().includes(q) ||
      (item.property_type && item.property_type.toLowerCase().includes(q))
    );
  });

  const countBadgeLabel =
    listings.length === 1 ? "1 Saved" : `${listings.length} Saved`;

  return (
    <div className="w-full space-y-6">
      {/* Header matching .Abangers UI prototype */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className="text-zinc-400 dark:text-zinc-500">Renter</span>
            <span className="text-zinc-400 dark:text-zinc-500">/</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              Favorites
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Saved Favorites
            </h1>
            <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              {countBadgeLabel}
            </span>
          </div>
        </div>

        {/* Search input if there are saved listings */}
        {listings.length > 0 && (
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter saved places..."
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white pr-9 pl-9.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear filter"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white/50 px-6 py-16 text-center shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400">
            <Heart className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            No saved favorites yet
          </h2>
          <p className="mt-1.5 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            Browse verified boarding houses, bed spaces, and solo rooms in Cebu.
            Click the heart icon on any card to save your top choices here.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/renter"
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-purple-700 active:bg-purple-800"
            >
              <Search className="h-4 w-4" />
              Start Browsing Places
            </Link>
          </div>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            No saved places match &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="mt-3 text-xs font-semibold text-purple-600 hover:underline dark:text-purple-400"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredListings.map((listing) => (
            <PublicListingCard
              key={listing.id}
              listing={listing}
              href={`/dashboard/renter/listings/${listing.id}?from=favorites`}
              flagOccupied
              action={
                <FavoriteButton
                  listingId={listing.id}
                  initialFavorited={true}
                  userRole="renter"
                  onToggle={(favorited) => handleToggle(listing, favorited)}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
