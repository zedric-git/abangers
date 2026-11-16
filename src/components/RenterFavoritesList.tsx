"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Heart,
  Search,
  X,
  Trash2,
  Eye,
  MessageSquare,
  CalendarCheck,
} from "lucide-react";
import type { ListingPreview } from "@/types/listing";
import PublicListingCard from "@/components/PublicListingCard";
import FavoriteButton from "@/components/FavoriteButton";
import { createClient } from "@/lib/supabase/client";
import { FAVORITE_REMOVE_ERROR_MESSAGE, removeFavorite } from "@/lib/favorites";

// Find a Place: renters browse in their dashboard, not /listings (#309).
const FIND_A_PLACE_PATH = "/dashboard/renter";

interface RenterFavoritesListProps {
  initialListings: ListingPreview[];
}

/**
 * Interactive list view for a renter's saved favorites (S2-09.1 #98, S2-09.2 #99).
 *
 * Implements the prototype layout and visual hierarchy from .Abangers UI:
 * - Breadcrumb 'Renter / Favorites' and 'Saved Favorites' title with pill badge
 * - 'Find More Places' action button leading to Find a Place
 * - In-place search filter for quickly finding saved boarding houses
 * - Responsive grid of saved listing cards with occupied status warning (#99)
 * - Smooth instant removal when unfavorited without full page reload (#98),
 *   and the card back with an error if the removal failed (#309)
 * - Informative empty state with 'Start Browsing Places' call-to-action
 */
export default function RenterFavoritesList({
  initialListings,
}: RenterFavoritesListProps) {
  const router = useRouter();
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState("");

  // The cards the renter took off the list. A card goes as soon as its
  // heart or Remove is clicked, and comes back, in the same place, if the
  // database didn't remove it (#309). The page's own list then follows
  // the server again (router.refresh() after each removal).
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [removeError, setRemoveError] = useState<string | null>(null);

  const hideCard = (listingId: string) => {
    setRemovedIds((prev) => new Set(prev).add(listingId));
  };

  const showCardAgain = (listingId: string) => {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(listingId);
      return next;
    });
  };

  // The heart (FavoriteButton) calls this with false as soon as it's
  // clicked, and with true if the database said no. Its own error message
  // goes with the card, so the list shows it instead.
  const handleToggle = (listingId: string, favorited: boolean) => {
    if (favorited) {
      showCardAgain(listingId);
      setRemoveError(FAVORITE_REMOVE_ERROR_MESSAGE);
    } else {
      setRemoveError(null);
      hideCard(listingId);
    }
  };

  // The Remove button. supabase-js returns errors instead of throwing, so
  // check the result: it used to be ignored, and a failed removal still
  // looked removed (#309).
  const handleRemove = async (listingId: string) => {
    setRemoveError(null);
    hideCard(listingId);
    const result = await removeFavorite(supabase, listingId);
    if (result.ok) {
      router.refresh();
      return;
    }
    showCardAgain(listingId);
    setRemoveError(result.error ?? FAVORITE_REMOVE_ERROR_MESSAGE);
  };

  const listings = initialListings.filter((item) => !removedIds.has(item.id));

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
          href={FIND_A_PLACE_PATH}
          className="inline-flex h-10 items-center gap-2 self-start rounded-xl bg-purple-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 sm:self-auto"
        >
          <Search className="h-4 w-4" />
          Find More Places
        </Link>
      </div>

      {/* A removal the database refused: the card is back, and this says why */}
      {removeError && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{removeError}</p>
        </div>
      )}

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
              href={FIND_A_PLACE_PATH}
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
          {filteredListings.map((listing) => {
            // The renter's own listing page, which leads back here (#309)
            const listingPage = `/dashboard/renter/listings/${listing.id}?from=favorites`;
            return (
              <PublicListingCard
                key={listing.id}
                listing={listing}
                href={listingPage}
                flagOccupied
                action={
                  <FavoriteButton
                    listingId={listing.id}
                    initialFavorited={true}
                    userRole="renter"
                    onToggle={(favorited) =>
                      handleToggle(listing.id, favorited)
                    }
                  />
                }
                footer={
                  <div className="space-y-2.5">
                    {/* Row 1: Remove on left, View & Inquire on right */}
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleRemove(listing.id)}
                        className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-rose-500 transition-colors hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <Link
                          href={listingPage}
                          className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors hover:border-purple-300 hover:text-purple-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-purple-600"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </Link>
                        <Link
                          href="/dashboard/renter/messages"
                          className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors hover:border-purple-300 hover:text-purple-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-purple-600"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Inquire</span>
                        </Link>
                      </div>
                    </div>

                    {/* Row 2: Schedule Viewing full-width button */}
                    <Link
                      href="/dashboard/renter/viewings"
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-purple-600 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-purple-700 active:bg-purple-800"
                    >
                      <CalendarCheck className="h-3.5 w-3.5" />
                      <span>Schedule Viewing</span>
                    </Link>
                  </div>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
