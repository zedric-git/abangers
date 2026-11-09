"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Search } from "lucide-react";
import type { ListingPreview } from "@/types/listing";
import PublicListingCard from "@/components/PublicListingCard";
import FavoriteButton from "@/components/FavoriteButton";
import { Button } from "@/components/ui/button";

interface RenterFavoritesListProps {
  initialListings: ListingPreview[];
}

/**
 * Interactive list view for a renter's saved favorites (S2-09.1 #98, S2-09.2 #99).
 *
 * Displays saved listings with photo, title, location, price, and availability.
 * Flags listings that are fully occupied with a warning banner and muted styling (#99).
 * Removes listings smoothly from the grid when unfavorited without a page reload (#98).
 */
export default function RenterFavoritesList({
  initialListings,
}: RenterFavoritesListProps) {
  const [listings, setListings] = useState<ListingPreview[]>(initialListings);

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

  const countLabel =
    listings.length === 1 ? "1 saved place" : `${listings.length} saved places`;

  return (
    <div className="space-y-6">
      {/* Header with Title and Real-time Count */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Favorites
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Keep track of boarding houses and dorms you are interested in.
          </p>
        </div>
        {listings.length > 0 && (
          <span className="inline-flex w-fit items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
            {countLabel}
          </span>
        )}
      </div>

      {/* Empty State */}
      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/40">
            <Heart className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold">
            No favorites saved yet
          </h2>
          <p className="text-muted-foreground mx-auto mt-1.5 max-w-sm text-sm">
            You haven&apos;t saved any boarding houses or dorms to your
            favorites yet. Browse listings to find and save your preferred
            places.
          </p>
          <div className="mt-6">
            <Button
              asChild
              className="bg-purple-600 text-white shadow-xs hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500"
            >
              <Link href="/listings">
                <Search className="mr-2 h-4 w-4" />
                Find a Place
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        /* Favorites Grid */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
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
