"use client";

import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Building,
  Users,
  Eye,
  Pencil,
  Bed,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Listing } from "@/types/listing";

interface LandlordListingCardProps {
  listing: Listing;
}

export default function LandlordListingCard({
  listing,
}: LandlordListingCardProps) {
  const coverPhoto = listing.cover_image || listing.images?.[0] || "";

  // Map availability status to badge styling and label
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return {
          label: "Available",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
          icon: (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          ),
        };
      case "almost_full":
        return {
          label: "Almost Full",
          bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
          icon: (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          ),
        };
      case "fully_occupied":
      case "unavailable":
      case "occupied":
        return {
          label: "Occupied",
          bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
          icon: (
            <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          ),
        };
      default:
        return {
          label: status || "Available",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
          icon: (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          ),
        };
    }
  };

  const statusBadge = getStatusBadge(listing.availability_status);
  const displayPrice = listing.monthly_rent ?? listing.price ?? 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {/* Cover Image Container */}
      <div className="relative aspect-16/10 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {coverPhoto ? (
          <Image
            src={coverPhoto}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-600">
            <Building className="h-10 w-10 stroke-[1.5]" />
          </div>
        )}

        {/* Status Badge (Top-Left) */}
        <div className="absolute top-3 left-3 z-10">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-xs backdrop-blur-md ${statusBadge.bg}`}
          >
            {statusBadge.icon}
            {statusBadge.label}
          </span>
        </div>

        {/* Price Tag (Bottom-Right) */}
        <div className="absolute right-3 bottom-3 z-10">
          <span className="rounded-xl bg-zinc-950/80 px-3 py-1.5 text-xs font-extrabold text-white shadow-md backdrop-blur-md dark:bg-zinc-900/90">
            ₱{Number(displayPrice).toLocaleString("en-US")} / mo
          </span>
        </div>
      </div>

      {/* Details Container */}
      <div className="flex flex-1 flex-col p-5">
        {/* Title */}
        <h3 className="line-clamp-1 text-base font-bold text-zinc-900 dark:text-zinc-100">
          {listing.title}
        </h3>

        {/* Location */}
        <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
          <span className="line-clamp-1">
            {listing.address}
            {listing.city ? `, ${listing.city}` : ""}
          </span>
        </p>

        {/* Key Feature Badges */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {listing.property_type && (
            <span className="rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {listing.property_type}
            </span>
          )}
          {listing.occupancy_type && (
            <span className="rounded-lg bg-purple-50 px-2 py-1 text-[11px] font-medium text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              {listing.occupancy_type}
            </span>
          )}
          {listing.allowed_gender && (
            <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              <Users className="mr-1 inline h-3 w-3" />
              {listing.allowed_gender}
            </span>
          )}
        </div>

        {/* Room specs */}
        <div className="mt-4 flex items-center gap-4 border-t border-zinc-100 pt-3 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <div className="flex items-center gap-1">
            <Bed className="h-3.5 w-3.5 text-zinc-400" />
            <span>
              <strong>{listing.available_rooms}</strong> /{" "}
              {listing.total_rooms || 1} available
            </span>
          </div>
        </div>

        {/* Card Actions Footer */}
        <div className="mt-5 flex items-center gap-2 pt-2">
          <Link
            href={`/dashboard/landlord/listings/${listing.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <Eye className="h-3.5 w-3.5" />
            View Detail
          </Link>
          <Link
            href={`/dashboard/landlord/listings/${listing.id}/edit`}
            className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            title="Edit Listing"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
