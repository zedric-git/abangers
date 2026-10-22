/**
 * What a listing photo can be (#234): the limits of the listing-photos
 * Storage bucket, in one place in the app.
 *
 * The bucket itself enforces them (supabase/migrations/
 * 0013_lock_down_listing_photos_bucket.sql: file_size_limit and
 * allowed_mime_types). ImageUploader checks each file with
 * listingPhotoProblem() before uploading it, so a landlord finds out
 * straight away which photo can't be used and why, instead of getting a
 * Storage error halfway through.
 *
 * Change these together with 0013 (in a new migration), and with
 * ImageUploader's "PNG, JPG, WEBP up to 10MB" hint.
 */

/** The bucket's size limit in 0013: 10 MB = 10 * 1024 * 1024 bytes. */
export const LISTING_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

/**
 * The file types the bucket accepts (0013). Not "image/*": that would
 * also allow SVG (which can contain scripts) and HEIC/TIFF (which most
 * browsers can't show).
 */
export const LISTING_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** For the file input's `accept`, so the picker only offers these. */
export const LISTING_PHOTO_ACCEPT = LISTING_PHOTO_TYPES.join(",");

/**
 * What the landlord is told about a photo that can't be used. The
 * uploader puts the file's name in front: "beach.heic: photos must be
 * JPEG, PNG or WebP".
 */
export const LISTING_PHOTO_MESSAGES = {
  wrong_type: "photos must be JPEG, PNG or WebP",
  too_big: "photos must be 10 MB or smaller",
  empty: "this file is empty",
  not_landlord: "only landlord accounts can upload listing photos",
  failed: "couldn't upload it. Try again.",
} as const;

/** Only the parts of a File that matter here, so tests can pass plain objects. */
type PickedFile = Pick<File, "type" | "size">;

function isListingPhotoType(type: string): boolean {
  return (LISTING_PHOTO_TYPES as readonly string[]).includes(type);
}

/**
 * Why `file` can't be uploaded as a listing photo, or null if it can.
 * The same checks the bucket makes, so a file that passes here is only
 * refused by Storage if something else went wrong.
 *
 * A file the browser gives no type (e.g. a HEIC photo on Windows) is
 * refused: Storage would refuse it too.
 */
export function listingPhotoProblem(file: PickedFile): string | null {
  if (!isListingPhotoType(file.type)) {
    return LISTING_PHOTO_MESSAGES.wrong_type;
  }
  if (file.size === 0) {
    return LISTING_PHOTO_MESSAGES.empty;
  }
  if (file.size > LISTING_PHOTO_MAX_BYTES) {
    return LISTING_PHOTO_MESSAGES.too_big;
  }
  return null;
}

/**
 * What to tell the landlord when Storage refuses an upload anyway.
 *
 * `statusCode` is supabase-js's `error.statusCode`, a string, not
 * `error.status`: Storage answers every refused upload with HTTP 400 and
 * puts the real code in the response body (AGENTS.md, #213).
 */
export function listingPhotoUploadErrorMessage(
  statusCode: string | undefined,
): string {
  switch (statusCode) {
    case "403": // RLS (0013): not a landlord, or not their own folder
      return LISTING_PHOTO_MESSAGES.not_landlord;
    case "413":
      return LISTING_PHOTO_MESSAGES.too_big;
    case "415":
      return LISTING_PHOTO_MESSAGES.wrong_type;
    default:
      return LISTING_PHOTO_MESSAGES.failed;
  }
}
