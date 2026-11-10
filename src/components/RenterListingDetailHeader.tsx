"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Heart,
  MessageSquare,
  Calendar,
  Check,
  Loader2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface RenterListingDetailHeaderProps {
  listingId: string;
  title: string;
  subtitle: string;
  initialFavorited?: boolean;
  from?: string;
  landlordContact?: string | null;
}

export default function RenterListingDetailHeader({
  listingId,
  title,
  subtitle,
  initialFavorited = false,
  from,
  landlordContact,
}: RenterListingDetailHeaderProps) {
  const [isSaved, setIsSaved] = useState(initialFavorited);
  const [isSaving, setIsSaving] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("10:00 AM");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const backHref =
    from === "favorites" ? "/dashboard/renter/favorites" : "/dashboard/renter";
  const backLabel =
    from === "favorites" ? "Back to Favorites" : "Back to All Boarding Houses";
  const sectionLabel = from === "favorites" ? "Favorites" : "Find a Place";

  const handleToggleFavorite = async () => {
    if (isSaving) return;
    const prev = isSaved;
    const next = !prev;
    setIsSaved(next);
    setIsSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsSaved(prev);
        return;
      }

      if (next) {
        await supabase
          .from("favorites")
          .insert({ renter_id: user.id, listing_id: listingId });
      } else {
        await supabase
          .from("favorites")
          .delete()
          .eq("renter_id", user.id)
          .eq("listing_id", listingId);
      }
    } catch {
      setIsSaved(prev);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBookViewing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate) return;
    setBookingLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Look up the listing's landlord_id
        const { data: listingData } = await supabase
          .from("listings")
          .select("landlord_id")
          .eq("id", listingId)
          .single();

        if (listingData?.landlord_id) {
          const isMorning = bookingTime === "10:00 AM";
          await supabase.from("viewing_requests").insert({
            renter_id: user.id,
            listing_id: listingId,
            landlord_id: listingData.landlord_id,
            viewing_date: bookingDate,
            start_time: isMorning ? "10:00:00" : "14:00:00",
            end_time: isMorning ? "10:30:00" : "14:30:00",
            message: bookingNotes.trim() || null,
            status: "pending",
          });
        }
      }
      setBookingSubmitted(true);
    } catch (err) {
      console.error("Error booking viewing:", err);
      setBookingSubmitted(true);
    } finally {
      setBookingLoading(false);
    }
  };

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

      {/* 3. Top Header Card (Matches Pic 1 prototype) */}
      <div className="flex flex-col gap-4 rounded-3xl border border-purple-100 bg-purple-50/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-purple-900/30 dark:bg-purple-950/20">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-xs">
            <Building2 className="h-6 w-6 stroke-[1.8]" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-zinc-50">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs font-medium text-zinc-600 sm:text-sm dark:text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons Right */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Save Button */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={isSaving}
            className={cn(
              "inline-flex h-9.5 cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold shadow-2xs transition-all",
              isSaved
                ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-rose-200 hover:text-rose-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
            )}
          >
            <Heart
              className={cn(
                "h-3.5 w-3.5",
                isSaved && "fill-rose-600 dark:fill-rose-400",
              )}
            />
            <span>{isSaved ? "Saved" : "Save"}</span>
          </button>

          {/* Chat Landlord Button */}
          <button
            type="button"
            onClick={() => setIsChatModalOpen(true)}
            className="inline-flex h-9.5 cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors hover:border-purple-300 hover:text-purple-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-purple-700"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Chat Landlord</span>
          </button>

          {/* Book Viewing Button */}
          <button
            type="button"
            onClick={() => setIsBookingModalOpen(true)}
            className="inline-flex h-9.5 cursor-pointer items-center gap-1.5 rounded-xl bg-purple-600 px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-700 active:bg-purple-800"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Book Viewing</span>
          </button>
        </div>
      </div>

      {/* 4. Callout Banner (Matches Pic 1 prototype) */}
      <div className="flex flex-col gap-3 rounded-2xl border border-purple-100 bg-purple-50/25 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-purple-900/30 dark:bg-purple-950/15">
        <p className="text-xs font-medium text-zinc-700 sm:text-sm dark:text-zinc-300">
          Interested in this boarding house?{" "}
          <span className="font-semibold text-purple-700 dark:text-purple-400">
            Book a scheduled viewing or message the landlord.
          </span>
        </p>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={isSaving}
            className={cn(
              "inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold shadow-2xs transition-all",
              isSaved
                ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-rose-200 hover:text-rose-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
            )}
          >
            <Heart
              className={cn(
                "h-3.5 w-3.5",
                isSaved && "fill-rose-600 dark:fill-rose-400",
              )}
            />
            <span>{isSaved ? "Saved" : "Save"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsChatModalOpen(true)}
            className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors hover:border-purple-300 hover:text-purple-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBookingModalOpen(true)}
            className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-700"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Book Viewing</span>
          </button>
        </div>
      </div>

      {/* Book Viewing Dialog */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                    Schedule a Viewing
                  </h3>
                  <p className="line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBookingModalOpen(false);
                  setBookingSubmitted(false);
                }}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {bookingSubmitted ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <Check className="h-6 w-6 stroke-[2.5]" />
                </div>
                <h4 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Viewing Request Sent!
                </h4>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  The landlord has been notified and will confirm your slot.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsBookingModalOpen(false);
                    setBookingSubmitted(false);
                  }}
                  className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-xl bg-purple-600 text-xs font-bold text-white transition-colors hover:bg-purple-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookViewing} className="mt-3 space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-zinc-200 px-3 text-xs text-zinc-900 focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Preferred Time Slot
                  </label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-zinc-200 px-3 text-xs text-zinc-900 focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="10:00 AM">
                      Morning (10:00 AM - 10:30 AM)
                    </option>
                    <option value="02:00 PM">
                      Afternoon (2:00 PM - 2:30 PM)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Note to Landlord (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="e.g. Inquiring about room availability for next semester"
                    className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-700 disabled:opacity-50"
                >
                  {bookingLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Submit Request"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

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
