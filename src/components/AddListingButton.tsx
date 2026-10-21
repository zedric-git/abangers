import Link from "next/link";
import { Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NEW_LISTING_PATH } from "@/lib/verify-account";

/**
 * The locked look. cn() (tailwind-merge) puts these in place of the
 * page's own colours, so the button keeps its size and shape.
 */
const LOCKED_COLOURS =
  "bg-zinc-200 text-zinc-700 shadow-none hover:bg-zinc-300 active:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

interface AddListingButtonProps {
  /** The landlord can't post yet: isAddListingLocked(). */
  locked: boolean;
  /** The page's own look for the button: its size, shape and colours. */
  className: string;
  /** What it says. Defaults to "Add New Listing". */
  label?: string;
}

/**
 * Every way in to the new-listing page (#205): the header buttons on the
 * dashboard and My Posted Listings, and their buttons for a first listing.
 *
 * Until the landlord can post (a complete profile and a verified account),
 * it's grey with a lock. It still opens the page, which then shows the
 * checklist of what's left instead of the form (newListingPageView in
 * src/lib/landlord-status-view.ts), so the landlord finds out why.
 *
 * No "use client": it has no state.
 */
export default function AddListingButton({
  locked,
  className,
  label = "Add New Listing",
}: AddListingButtonProps) {
  const ButtonIcon = locked ? Lock : Plus;

  return (
    <Link
      href={NEW_LISTING_PATH}
      className={locked ? cn(className, LOCKED_COLOURS) : className}
    >
      <ButtonIcon className="h-4 w-4" />
      {label}
      {locked && <span className="sr-only"> (locked)</span>}
    </Link>
  );
}
