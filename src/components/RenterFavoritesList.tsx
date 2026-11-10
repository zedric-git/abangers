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
 * - Breadcrumb 'Renter / Favorites' and 'Saved Favorites' title with pill badge
 * - 'Find More Places' action button leading to /listings
 * - In-place search filter for quickly finding saved boarding houses
 * - Responsive grid of saved listing cards with occupied status warning (#99)
 * - Smooth instant removal when unfavorited without full page reload (#98)
 * - Informative empty state with 'Start Browsing Places' call-to-action
 */
export default function RenterFavoritesList({
  initialListings,
}: RenterFavoritesListProps) {
  const [listings, setListings] = useState<ListingPreview[]>(initialListings);
  const [searchQuery, setSearchQuery] = useState("");

  const handleToggle = (listing: ListingPreview, nextState: boolean) => {
    if (!nextState) {
      setListings((prev) => prev.filter((item) => item.id !== listing.id));
    } else {
      setListings((prev) => {
        if (prev.some((item) => item.id === listing.id)) {
          return prev;
        }
        return [listing, ...prev];
      });
    }
  };

  const filteredListings = listings.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.city && item.city.toLowerCase().includes(q)) ||
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

        <Link
          href="/listings"
          className="inline-flex h-10 items-center gap-2 self-start rounded-xl bg-purple-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 sm:self-auto"
        >
          <Search className="h-4 w-4" />
          Find More Places
        </Link>
      </div>

      {/* In-place search filter (from .Abangers UI) */}
      {listings.length > 0 && (
        <div className="relative">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved places by name, city, or address..."
            className="h-10 w-full rounded-2xl border border-zinc-200 bg-white pr-9 pl-10 text-xs shadow-2xs focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear filter"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Favorites Content: Empty State vs Filtered Empty vs Grid */}
      {listings.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-950/50">
            <Heart className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
            No saved favorites yet
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            Click the heart icon on any property in Find a Place to bookmark it
            for later.
          </p>
          <div className="mt-5">
            <Link
              href="/listings"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-purple-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700"
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
