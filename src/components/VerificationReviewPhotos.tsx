import Image from "next/image";
import { ExternalLink } from "lucide-react";
import type { ReviewPhoto } from "@/lib/auth/review-verification";
import { reviewPhotoLabel } from "@/lib/admin-review-view";

interface VerificationReviewPhotosProps {
  /** With their short-lived signed links (loadSubmissionForReview). */
  photos: ReviewPhoto[];
  /** For the labels: a passport has only its photo page. */
  idType: string;
  /** For the alt text; null when the profile has none. */
  landlordName: string | null;
  /** How long the links work (signedLinksNote). */
  note: string;
}

/**
 * The ID photos and selfie on the admin's review page (S2-11.2, #256),
 * each shown whole so nothing is cut off, and opening full size in a new
 * tab.
 *
 * `unoptimized`: the browser loads each photo straight from its signed
 * link. Next's image optimizer would otherwise download these private ID
 * photos and keep copies on our server (Next's docs say to use it for
 * images that need authentication).
 */
export default function VerificationReviewPhotos({
  photos,
  idType,
  landlordName,
  note,
}: VerificationReviewPhotosProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        {photos.map((photo) => {
          const label = reviewPhotoLabel(photo.name, idType);
          return (
            <figure key={photo.name} className="space-y-2">
              <a
                href={photo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block aspect-[4/3] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 transition-colors hover:border-purple-400 dark:border-zinc-800 dark:bg-zinc-800"
              >
                <Image
                  src={photo.url}
                  alt={
                    landlordName ? `${label} sent by ${landlordName}` : label
                  }
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                  className="object-contain"
                />
                <span className="sr-only">(opens full size in a new tab)</span>
              </a>
              <figcaption className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {label}
                <ExternalLink
                  className="h-3.5 w-3.5 text-zinc-400"
                  aria-hidden="true"
                />
              </figcaption>
            </figure>
          );
        })}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{note}</p>
    </div>
  );
}
