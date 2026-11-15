import { AlertCircle } from "lucide-react";
import { MISSING_PUBLIC_LISTING_NOTE } from "@/lib/listing-lookup";
import { cn } from "@/lib/utils";

/**
 * Says why a visitor landed on a list of listings: the listing page they
 * opened sent them here because the listing is gone (deleted, or a bad id
 * in the URL, #244). /listings, and the renter's Find a Place and
 * Favorites show it (#93, #309).
 *
 * The page decides when to show it, from `?notice=listing-not-found`. The
 * text is fixed here, so nothing from the URL is shown on the page.
 */
export default function MissingListingNote({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
        className,
      )}
    >
      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p>{MISSING_PUBLIC_LISTING_NOTE}</p>
    </div>
  );
}
