"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Building,
  Eye,
  MoreVertical,
  MessageSquare,
} from "lucide-react";
import { Listing } from "@/types/listing";
import DeleteListingModal from "@/components/DeleteListingModal";

interface LandlordListingCardProps {
  listing: Listing;
}

export default function LandlordListingCard({
  listing,
}: LandlordListingCardProps) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const coverPhoto = listing.cover_image || listing.images?.[0] || "";

  const displayPrice = listing.monthly_rent ?? listing.price ?? 0;

  const isAvailable =
    listing.availability_status === "available" ||
    listing.availability_status === "active";

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
                  listing.available_rooms > 0 ? "text-white" : "text-red-500"
                }`}
              >
                {listing.available_rooms} rooms available
              </span>
            </div>
          </div>
        </div>

        {/* Column 3: Status & Stats */}
        <div className="flex shrink-0 flex-col justify-center gap-1 md:w-[130px]">
          <div>
            {isAvailable ? (
              <span className="inline-flex items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold tracking-wider text-emerald-500 uppercase dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs font-bold tracking-wider text-rose-500 uppercase dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400">
                Fully Occupied
              </span>
            )}
          </div>
          <span className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Updated 2 days ago
          </span>
          <div className="flex items-center gap-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> 84
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> 6
            </span>
          </div>
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
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-rose-600 dark:border-zinc-700 dark:bg-[#1f1f22] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-rose-500"
            title="Options"
          >
            <MoreVertical className="h-4 w-4" />
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
