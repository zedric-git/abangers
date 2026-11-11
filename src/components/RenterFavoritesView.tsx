"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  MapPin,
  CalendarCheck,
  Trash2,
  ShieldCheck,
  Search,
  Eye,
} from "lucide-react";
import type { ListingPreview } from "@/types/listing";
import { createClient } from "@/lib/supabase/client";
import { removeFavorite } from "@/lib/favorites";

export interface FavoriteItem {
  id: string;
  title: string;
  roomType: string;
  price: number;
  location: string;
  distance: string;
  landlord: string;
  landlordVerified: boolean;
  amenities: string[];
}

export const initialFavorites: FavoriteItem[] = [
  {
    id: "PROP-1",
    title: "Sampaloc Scholar Suites",
    roomType: "Female Bedspace (Rm 204)",
    price: 4200,
    location: "842 España Blvd, Sampaloc, Manila (Near UST)",
    distance: "350m from UST Main Building",
    landlord: "Rodrigo D. Alonzo",
    landlordVerified: true,
    amenities: ["Wi-Fi", "Aircon", "Study Lounge", "24/7 Security"],
  },
  {
    id: "PROP-2",
    title: "Katipunan Prime Studio",
    roomType: "Solo Studio (Unit 3B)",
    price: 8500,
    location: "123 Katipunan Ave, QC (Near Ateneo & Miriam)",
    distance: "600m from Ateneo Gate 3",
    landlord: "Teresa Ramos Castro",
    landlordVerified: true,
    amenities: ["High-speed Wi-Fi", "Kitchenette", "Motorcycle Parking"],
  },
];

interface RenterFavoritesViewProps {
  initialListings?: ListingPreview[];
}

export default function RenterFavoritesView({
  initialListings,
}: RenterFavoritesViewProps = {}) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    if (initialListings && initialListings.length > 0) {
      return initialListings.map((l) => ({
        id: l.id,
        title: l.title,
        roomType:
          [l.occupancy_type, l.allowed_gender].filter(Boolean).join(" • ") ||
          l.property_type ||
          "Room",
        price: l.monthly_rent,
        location: [l.address, l.city].filter(Boolean).join(", "),
        distance: "Near university / campus",
        landlord: "Verified Landlord",
        landlordVerified: true,
        amenities:
          l.amenities && l.amenities.length > 0
            ? l.amenities
            : ["Wi-Fi", "Electric Sub-meter", "Water Sub-meter"],
      }));
    }
    return initialFavorites;
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

  const filtered = favorites.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      f.title.toLowerCase().includes(q) ||
      f.location.toLowerCase().includes(q) ||
      f.roomType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-6">
      {/* Header matching .Abangers UI */}
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

      {/* Favorites List */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xs transition-all hover:border-purple-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/renter/listings/${item.id}`}
                        className="text-lg font-bold text-zinc-900 hover:text-purple-600 dark:text-zinc-50 dark:hover:text-purple-400"
                      >
                        {item.title}
                      </Link>
                      {item.landlordVerified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                      {item.roomType}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
                      ₱{item.price.toLocaleString()}
                    </span>
                    <span className="block text-[10px] text-zinc-400">
                      / month
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    <span>{item.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pl-5 font-medium text-emerald-600 dark:text-emerald-400">
                    <span>📍 {item.distance}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {item.amenities.map((amenity, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/renter/listings/${item.id}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:border-purple-300 hover:text-purple-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Link>
                  <Link
                    href="/dashboard/renter/messages"
                    className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Inquire
                  </Link>
                  <Link
                    href="/dashboard/renter/viewings"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700"
                  >
                    <CalendarCheck className="h-3.5 w-3.5" />
                    Schedule Visit
                  </Link>
                </div>
              </div>
            </div>
          ))}
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
