"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  MapPin,
  CalendarCheck,
  Trash2,
  Search,
  Eye,
  Building,
  Users,
} from "lucide-react";
import type { ListingPreview } from "@/types/listing";
import { createClient } from "@/lib/supabase/client";
import { removeFavorite } from "@/lib/favorites";

export interface FavoriteListingItem {
  id: string;
  title: string;
  monthly_rent: number;
  occupancy_type?: string | null;
  property_type?: string | null;
  address: string;
  city?: string | null;
  available_rooms?: number;
  allowed_gender?: string | null;
  cover_image?: string | null;
  images?: string[] | null;
  availability_status?: string;
}

export const initialFavoriteListings: FavoriteListingItem[] = [
  {
    id: "PROP-1",
    title: "Sampaloc Scholar Suites",
    monthly_rent: 4200,
    occupancy_type: "Female Bedspace",
    property_type: "Boarding House",
    address: "842 España Blvd, Sampaloc, Manila (Near UST)",
    city: "Manila",
    available_rooms: 1,
    allowed_gender: "Female Only",
    cover_image:
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
    availability_status: "available",
  },
  {
    id: "PROP-2",
    title: "Katipunan Prime Studio",
    monthly_rent: 8500,
    occupancy_type: "Solo Studio",
    property_type: "Apartment",
    address: "123 Katipunan Ave, QC (Near Ateneo & Miriam)",
    city: "Quezon City",
    available_rooms: 2,
    allowed_gender: "Any / Co-ed",
    cover_image:
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
    availability_status: "available",
  },
];

interface RenterFavoritesViewProps {
  initialListings?: ListingPreview[];
}

export default function RenterFavoritesView({
  initialListings,
}: RenterFavoritesViewProps = {}) {
  const [favorites, setFavorites] = useState<FavoriteListingItem[]>(() => {
    if (initialListings && initialListings.length > 0) {
      return initialListings.map((l) => ({
        id: l.id,
        title: l.title,
        monthly_rent: l.monthly_rent,
        occupancy_type: l.occupancy_type,
        property_type: l.property_type,
        address: l.address,
        city: l.city,
        available_rooms: l.available_rooms ?? 1,
        allowed_gender: l.allowed_gender,
        cover_image: l.cover_image || l.images?.[0] || null,
        images: l.images,
        availability_status: l.availability_status || "available",
      }));
    }
    return initialFavoriteListings;
  });

  const [searchQuery, setSearchQuery] = useState("");

  const handleRemove = async (id: string) => {
    setFavorites((prev) => prev.filter((item) => item.id !== id));
    try {
      const supabase = createClient();
      await removeFavorite(supabase, id);
    } catch {
      // Mock items or unauthenticated calls silently handled
    }
  };

  const filtered = favorites.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.address.toLowerCase().includes(q) ||
      (item.city && item.city.toLowerCase().includes(q)) ||
      (item.occupancy_type && item.occupancy_type.toLowerCase().includes(q)) ||
      (item.property_type && item.property_type.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full space-y-6">
      {/* Header */}
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
              {favorites.length} Saved
            </span>
          </div>
        </div>

        <Link
          href="/dashboard/renter"
          className="inline-flex h-10 items-center gap-2 self-start rounded-xl bg-purple-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 sm:self-auto"
        >
          <Search className="h-4 w-4" />
          Find More Places
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter saved boarding houses..."
          className="h-10 w-full rounded-2xl border border-zinc-200 bg-white pr-4 pl-10 text-xs shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900"
        />
      </div>

      {/* Favorites List - Find a Place Card Layout with Action Buttons */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const destinationHref = `/dashboard/renter/listings/${item.id}?from=favorites`;
            return (
              <article
                key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                {/* Image Container */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <Link
                    href={destinationHref}
                    aria-label={`View details for ${item.title}`}
                    className="relative block h-full w-full"
                  >
                    {item.cover_image ? (
                      <Image
                        src={item.cover_image}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-600">
                        <Building className="h-10 w-10 stroke-[1.5]" />
                      </div>
                    )}
                  </Link>

                  {/* Status Badge */}
                  <div className="pointer-events-none absolute top-3 left-3 z-10">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-xs font-semibold text-white shadow-xs backdrop-blur-xs dark:bg-emerald-600/90">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                      Available
                    </span>
                  </div>

                  {/* Top-Right Favorite Heart Toggle */}
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemove(item.id);
                      }}
                      aria-label={`Remove ${item.title} from favorites`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-rose-600 shadow-sm backdrop-blur-xs transition-transform hover:scale-110 active:scale-95 dark:bg-zinc-900/90 dark:text-rose-400"
                      title="Remove from favorites"
                    >
                      <Heart className="h-4.5 w-4.5 fill-rose-600 dark:fill-rose-400" />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  {/* Price & Occupancy */}
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-extrabold text-zinc-950 dark:text-zinc-50">
                        ₱{item.monthly_rent.toLocaleString("en-US")}
                      </span>
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        / month
                      </span>
                    </div>

                    {item.occupancy_type && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        <Users className="h-3 w-3" />
                        {item.occupancy_type}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <Link href={destinationHref} className="mt-2 block">
                    <h3 className="line-clamp-1 text-base font-bold text-zinc-900 transition-colors group-hover:text-purple-600 dark:text-zinc-100 dark:group-hover:text-purple-400">
                      {item.title}
                    </h3>
                  </Link>

                  {/* Location */}
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                    <span className="line-clamp-1">
                      {item.address}
                      {item.city ? `, ${item.city}` : ""}
                    </span>
                  </p>

                  {/* Rooms Available & Allowed Gender */}
                  <div className="mt-3 flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <span
                      className={
                        (item.available_rooms ?? 1) > 0
                          ? "font-semibold text-emerald-600 dark:text-emerald-400"
                          : "font-semibold text-rose-500 dark:text-rose-400"
                      }
                    >
                      {(item.available_rooms ?? 1) > 0
                        ? `${item.available_rooms ?? 1} ${item.available_rooms === 1 ? "room" : "rooms"} available`
                        : "No rooms available"}
                    </span>

                    {item.allowed_gender && (
                      <span className="text-zinc-400 dark:text-zinc-500">
                        {item.allowed_gender}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons Bar matching Favorites Prototype */}
                  <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-rose-500 transition-colors hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={destinationHref}
                        className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors hover:border-purple-300 hover:text-purple-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-purple-600"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                      <Link
                        href="/dashboard/renter/messages"
                        className="rounded-xl border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Inquire
                      </Link>
                      <Link
                        href="/dashboard/renter/viewings"
                        className="inline-flex items-center gap-1 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-purple-700"
                      >
                        <CalendarCheck className="h-3.5 w-3.5" />
                        Schedule Visit
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-950/50">
            <Heart className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
            No saved favorites yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            Click the heart icon on any property in Find a Place to bookmark it
            for later.
          </p>
          <div className="mt-5">
            <Link
              href="/dashboard/renter"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-purple-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700"
            >
              Start Browsing Places
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
