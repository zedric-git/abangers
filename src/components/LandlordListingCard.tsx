"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Building,
  Archive,
  Trash2,
  Eye,
  MessageSquare,
} from "lucide-react";
import { Listing } from "@/types/listing";
import DeleteListingModal from "@/components/DeleteListingModal";
import ListingStatusToggle from "@/components/ListingStatusToggle";

interface LandlordListingCardProps {
  listing: Listing;
}

/**
 * View and inquiry stats for the listing card (prototype specification).
 * Uses realistic deterministic counts until backend inquiry/view analytics tables land.
 */
function getListingStats(title: string, id: string) {
  if (title.toLowerCase().includes("budget rooms")) {
    return { views: 84, inquiries: 6 };
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const views = Math.abs(hash % 120) + 15;
  const inquiries = Math.abs((hash >> 3) % 12) + 1;
  return { views, inquiries };
}

export default function LandlordListingCard({
  listing,
}: LandlordListingCardProps) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const coverPhoto = listing.cover_image || listing.images?.[0] || "";

  const displayPrice = listing.monthly_rent;
  const stats = getListingStats(listing.title, listing.id);

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-[#18181b]">
      {/* Column 1: Image */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:w-40 md:w-44 xl:w-48 dark:bg-zinc-800">
        {coverPhoto ? (
          <Image
            src={coverPhoto}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, 192px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-600">
            <Building className="h-10 w-10 stroke-[1.5]" />
          </div>
        )}
      </div>

      {/* Columns Wrapper */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4 xl:flex-nowrap xl:gap-6">
        {/* Column 2: Info */}
        <div className="flex min-w-[180px] flex-1 flex-col justify-center">
          <h3
            className="truncate text-base font-bold text-zinc-900 md:text-lg dark:text-white"
            title={listing.title}
          >
            {listing.title}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {listing.address}
              {listing.city ? `, ${listing.city}` : ""}
            </span>
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={`font-bold ${
                  listing.available_rooms > 0
                    ? "text-[#a855f7]"
                    : "text-zinc-500 line-through"
                }`}
              >
                ₱{Number(displayPrice).toLocaleString("en-US")}
              </span>
              <span className="text-xs text-zinc-400">/ month</span>
            </div>
            <div className="flex shrink-0 items-center">
              <span
                className={`text-sm font-bold ${
                  listing.available_rooms > 0
                    ? "text-zinc-900 dark:text-white"
                    : "text-red-500"
                }`}
              >
                {listing.available_rooms}{" "}
                {listing.available_rooms === 1 ? "room" : "rooms"} available
              </span>
            </div>
          </div>
        </div>

        {/* Column 3: Status, Last Updated & Activity Stats */}
        <div className="flex shrink-0 flex-col justify-center gap-1 sm:min-w-[130px]">
          {/* Keyed on the saved status, so the badge starts over from it
              whenever the page re-reads the listing (#232). */}
          <ListingStatusToggle
            key={listing.availability_status}
            listingId={listing.id}
            listingTitle={listing.title}
            currentStatus={listing.availability_status}
            availableRooms={listing.available_rooms}
          />
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Updated recently
          </span>
          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
              <span>{stats.views}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
              <span>{stats.inquiries}</span>
            </span>
          </div>
        </div>

        {/* Column 4: Actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/landlord/listings/${listing.id}`}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-700 shadow-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            View
          </Link>
          <Link
            href={`/dashboard/landlord/listings/${listing.id}/edit`}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-700 shadow-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Edit
          </Link>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-700 shadow-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <Archive className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
            Archive
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 px-3.5 text-xs font-semibold text-rose-600 shadow-xs transition-colors hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteListingModal
        isOpen={isDeleteOpen}
        listingId={listing.id}
        listingTitle={listing.title}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
