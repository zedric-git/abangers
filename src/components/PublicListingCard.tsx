"use client";

import Image from "next/image";
import { Building, MapPin, ArrowRight } from "lucide-react";
import type { Listing } from "@/types/listing";

interface PublicListingCardProps {
  listing: Listing;
  onViewDetails: (listing: Listing) => void;
}

export default function PublicListingCard({
  listing,
  onViewDetails,
}: PublicListingCardProps) {
  const coverPhoto = listing.cover_image || listing.images?.[0] || "";
  const isAvailable = listing.available_rooms > 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {/* Cover Photo */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {coverPhoto ? (
          <Image
            src={coverPhoto}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-purple-100 to-indigo-100 text-purple-600 dark:from-purple-950/40 dark:to-indigo-950/40 dark:text-purple-400">
            <Building className="h-10 w-10 stroke-[1.5]" />
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute top-3 left-3 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-extrabold text-zinc-900 shadow-xs backdrop-blur-xs dark:bg-zinc-900/95 dark:text-white">
          ₱{Number(listing.monthly_rent).toLocaleString("en-US")}
          <span className="font-normal text-zinc-500 dark:text-zinc-400">
            {" "}
            / mo
          </span>
        </div>

        {/* Room Availability Pill */}
        <div
          className={`absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-xs ${
            isAvailable
              ? "bg-emerald-500 text-white"
              : "bg-zinc-600 text-zinc-200"
          }`}
        >
          {isAvailable
            ? `${listing.available_rooms} room${listing.available_rooms > 1 ? "s" : ""} left`
            : "Fully occupied"}
        </div>
      </div>

      {/* Info Container */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <h3
            className="text-base font-bold text-zinc-900 transition-colors group-hover:text-purple-700 dark:text-zinc-100 dark:group-hover:text-purple-400"
            title={listing.title}
          >
            {listing.title}
          </h3>

          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            <span className="truncate">
              {listing.address}
              {listing.city ? `, ${listing.city}` : ""}
            </span>
          </p>

          {/* Amenities Pills */}
          {listing.amenities && listing.amenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {listing.amenities.slice(0, 3).map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {amenity}
                </span>
              ))}
              {listing.amenities.length > 3 && (
                <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-400 dark:bg-zinc-800">
                  +{listing.amenities.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* View Details Action */}
        <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {listing.property_type || "Boarding House"}
          </span>

          <button
            type="button"
            onClick={() => onViewDetails(listing)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-700 active:bg-purple-800"
          >
            <span>View Details</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
