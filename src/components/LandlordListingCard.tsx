"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Building, MoreVertical, Trash2 } from "lucide-react";
import { Listing } from "@/types/listing";
import DeleteListingModal from "@/components/DeleteListingModal";
import ListingStatusToggle from "@/components/ListingStatusToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// "Oct 20, 2026", always in Philippine time. A fixed date (not "2 days
// ago") in a fixed time zone renders the same on the server and in the
// browser, so React doesn't see a hydration mismatch.
const UPDATED_DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeZone: "Asia/Manila",
});

interface LandlordListingCardProps {
  listing: Listing;
}

export default function LandlordListingCard({
  listing,
}: LandlordListingCardProps) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const coverPhoto = listing.cover_image || listing.images?.[0] || "";

  const displayPrice = listing.monthly_rent;
  const updatedDate = UPDATED_DATE_FORMAT.format(new Date(listing.updated_at));

  return (
    <div className="flex w-full flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-[#18181b]">
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
            className="truncate text-lg font-bold text-zinc-900 md:text-xl dark:text-white"
            title={listing.title}
          >
            {listing.title}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {listing.address}
              {listing.city ? `, ${listing.city}` : ""}
            </span>
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
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
                {listing.available_rooms} rooms available
              </span>
            </div>
          </div>
        </div>

        {/* Column 3: Status & Last Updated */}
        <div className="flex shrink-0 flex-col justify-center gap-1 md:w-[170px]">
          {/* Keyed on the saved status, so the badge starts over from it
              whenever the page re-reads the listing (#232). */}
          <ListingStatusToggle
            key={listing.availability_status}
            listingId={listing.id}
            listingTitle={listing.title}
            currentStatus={listing.availability_status}
            availableRooms={listing.available_rooms}
          />
          <span className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Updated {updatedDate}
          </span>
        </div>

        {/* Column 4: Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/dashboard/landlord/listings/${listing.id}`}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-[#1f1f22] dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            View
          </Link>
          <Link
            href={`/dashboard/landlord/listings/${listing.id}/edit`}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-[#1f1f22] dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Edit
          </Link>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`More actions for ${listing.title}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 data-[state=open]:bg-zinc-50 dark:border-zinc-700 dark:bg-[#1f1f22] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:data-[state=open]:bg-zinc-800"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 rounded-xl border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            >
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setIsDeleteOpen(true)}
                className="cursor-pointer rounded-lg text-sm font-semibold text-rose-600 focus:bg-rose-50 focus:text-rose-700 dark:text-rose-400 dark:focus:bg-rose-950/60 dark:focus:text-rose-300"
              >
                <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                Delete listing
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
