"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, X } from "lucide-react";

interface RenterListingDetailHeaderProps {
  /** The listing's title, for the breadcrumb. */
  title: string;
  /** "favorites" when the renter opened the listing from Favorites. */
  from?: string;
  landlordContact?: string | null;
}

/**
 * The top of the renter's listing page (#291): the breadcrumb, the way
 * back, and a bar with Chat Landlord.
 *
 * The listing's title, its tags and the Save button are in
 * ListingDetailView, under this, so they show once (#309). The Book
 * Viewing dialog that used to be here is gone: it said "sent" even when
 * the request failed. #108 builds the real viewing-request form.
 *
 * A Client Component for the Chat dialog.
 */
export default function RenterListingDetailHeader({
  title,
  from,
  landlordContact,
}: RenterListingDetailHeaderProps) {
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  const backHref =
    from === "favorites" ? "/dashboard/renter/favorites" : "/dashboard/renter";
  const backLabel =
    from === "favorites" ? "Back to Favorites" : "Back to All Boarding Houses";
  const sectionLabel = from === "favorites" ? "Favorites" : "Find a Place";

  return (
    <div className="space-y-4">
      {/* 1. Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <span>Renter</span>
        <span className="text-zinc-400 dark:text-zinc-600">/</span>
        <Link
          href={backHref}
          className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {sectionLabel}
        </Link>
        <span className="text-zinc-400 dark:text-zinc-600">/</span>
        <span className="truncate font-semibold text-purple-600 dark:text-purple-400">
          {title}
        </span>
      </div>

      {/* 2. Back Navigation Link */}
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700 transition-colors hover:text-purple-600 sm:text-sm dark:text-zinc-300 dark:hover:text-purple-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{backLabel}</span>
        </Link>
      </div>

      {/* 3. Callout Banner (Matches Pic 1 prototype) */}
      <div className="flex flex-col gap-3 rounded-2xl border border-purple-100 bg-purple-50/25 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-purple-900/30 dark:bg-purple-950/15">
        <p className="text-xs font-medium text-zinc-700 sm:text-sm dark:text-zinc-300">
          Interested in this boarding house?{" "}
          <span className="font-semibold text-purple-700 dark:text-purple-400">
            Get in touch with the landlord.
          </span>
        </p>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsChatModalOpen(true)}
            className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-700"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Chat Landlord</span>
          </button>
        </div>
      </div>

      {/* Chat Landlord Contact Dialog */}
      {isChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                    Contact Landlord
                  </h3>
                  <p className="line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Direct communication
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChatModalOpen(false)}
                aria-label="Close"
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/60">
                <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  Contact Information
                </span>
                <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {landlordContact || "Phone shared upon viewing confirmation"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsChatModalOpen(false)}
              className="mt-5 flex h-10 w-full items-center justify-center rounded-xl bg-purple-600 text-xs font-bold text-white transition-colors hover:bg-purple-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
