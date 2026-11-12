import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Building, MapPin, Users } from "lucide-react";
import type { ListingPreview } from "@/types/listing";
import { listingStatusView } from "@/lib/listing-status-view";
import { cn } from "@/lib/utils";

interface PublicListingCardProps {
  listing: ListingPreview;
  /**
   * Optional action button slot in top corner (e.g. favorite toggle from #96).
   */
  action?: React.ReactNode;
  /**
   * Visually flag if the listing is occupied/unavailable with an alert banner
   * and subtle muted overlay (S2-09.2, #99).
   */
  flagOccupied?: boolean;
  /**
   * Intercepts card click for unauthenticated guests, opening the Auth Modal (#86).
   */
  onRequireAuth?: (listing: ListingPreview) => void;
}

/**
 * Public listing card for renters and guests (S2-04, #87).
 *
 * Displays listing photo, price, availability status, title, location,
 * room availability, and links to the public detail page (/listings/[id]).
 */
export default function PublicListingCard({
  listing,
  action,
  flagOccupied = false,
  onRequireAuth,
}: PublicListingCardProps) {
  const coverPhoto = listing.cover_image || listing.images?.[0] || "";
  const statusView = listingStatusView(listing.availability_status);
  const isOccupied = statusView.group === "occupied";
  const showOccupiedFlag = flagOccupied && isOccupied;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
        showOccupiedFlag &&
          "border-rose-200/70 opacity-90 dark:border-rose-950/50 dark:opacity-85",
      )}
    >
      {/* Clickable Overlay — Link when authenticated, or Auth Prompt button for guests (#86) */}
      {onRequireAuth ? (
        <button
          type="button"
          onClick={() => onRequireAuth(listing)}
          aria-label={`View details for ${listing.title} (Requires sign in)`}
          className="absolute inset-0 z-10 cursor-pointer text-left"
        >
          <span className="sr-only">View {listing.title}</span>
        </button>
      ) : (
        <Link
          href={`/listings/${listing.id}`}
          aria-label={`View details for ${listing.title}`}
          className="absolute inset-0 z-10"
        >
          <span className="sr-only">View {listing.title}</span>
        </Link>
      )}

      {/* Image Container */}
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
          <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-600">
            <Building className="h-10 w-10 stroke-[1.5]" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3 z-20">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-xs ${statusView.badgeClassName}`}
          >
            {statusView.label}
          </span>
        </div>

        {/* Action Slot (e.g. Favorite button, S2-08.2 #96) */}
        {action && <div className="absolute top-3 right-3 z-20">{action}</div>}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Occupancy Warning Banner (S2-09.2, #99) */}
        {showOccupiedFlag && (
          <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>This property is currently full.</span>
          </div>
        )}

        {/* Price & Occupancy */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-zinc-950 dark:text-zinc-50">
              ₱{listing.monthly_rent.toLocaleString("en-US")}
            </span>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              / month
            </span>
          </div>

          {listing.occupancy_type && (
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <Users className="h-3 w-3" />
              {listing.occupancy_type}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-2 line-clamp-1 text-base font-bold text-zinc-900 group-hover:text-purple-600 dark:text-zinc-100 dark:group-hover:text-purple-400">
          {listing.title}
        </h3>

        {/* Location */}
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
          <span className="line-clamp-1">
            {listing.address}
            {listing.city ? `, ${listing.city}` : ""}
          </span>
        </p>

        {/* Description Snippet (if available) */}
        {listing.description && (
          <p className="mt-2 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
            {listing.description}
          </p>
        )}

        {/* Footer Meta: Available Rooms & Gender Policy */}
        <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-4 text-xs font-medium text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
          <span
            className={
              listing.available_rooms > 0
                ? "font-semibold text-emerald-600 dark:text-emerald-400"
                : "font-semibold text-rose-500 dark:text-rose-400"
            }
          >
            {listing.available_rooms > 0
              ? `${listing.available_rooms} ${listing.available_rooms === 1 ? "room" : "rooms"} available`
              : "No rooms available"}
          </span>

          {listing.allowed_gender && (
            <span className="text-zinc-400 dark:text-zinc-500">
              {listing.allowed_gender}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
