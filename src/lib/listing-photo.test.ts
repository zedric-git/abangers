import { describe, expect, it } from "vitest";
import {
  LISTING_PHOTO_ACCEPT,
  LISTING_PHOTO_MAX_BYTES,
  LISTING_PHOTO_MESSAGES,
  listingPhotoProblem,
  listingPhotoUploadErrorMessage,
} from "./listing-photo";

/** A file the landlord picked: a real File, 100 bytes of the given type. */
function picked(type: string, name = "photo") {
  return new File([new Uint8Array(100)], name, { type });
}

describe("listingPhotoProblem", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])(
    "accepts a %s photo",
    (type) => {
      expect(listingPhotoProblem(picked(type))).toBeNull();
    },
  );

  it.each([
    ["image/svg+xml", "logo.svg"],
    ["image/heic", "IMG_0001.HEIC"],
    ["image/gif", "dance.gif"],
    ["application/pdf", "floor-plan.pdf"],
    ["", "IMG_0001.heic"], // Windows doesn't always know a HEIC's type
  ])("refuses a %j file (%s)", (type, name) => {
    expect(listingPhotoProblem(picked(type, name))).toBe(
      LISTING_PHOTO_MESSAGES.wrong_type,
    );
  });

  it("accepts a photo of exactly 10 MB", () => {
    const file = { type: "image/jpeg", size: 10 * 1024 * 1024 };
    expect(listingPhotoProblem(file)).toBeNull();
  });

  it("refuses a photo 1 byte over 10 MB", () => {
    const file = { type: "image/jpeg", size: 10 * 1024 * 1024 + 1 };
    expect(listingPhotoProblem(file)).toBe(LISTING_PHOTO_MESSAGES.too_big);
  });

  it("refuses an empty file", () => {
    const file = new File([], "photo.jpg", { type: "image/jpeg" });
    expect(listingPhotoProblem(file)).toBe(LISTING_PHOTO_MESSAGES.empty);
  });

  it("has the same limits as the bucket in 0013", () => {
    // 0013: file_size_limit = 10485760,
    // allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
    expect(LISTING_PHOTO_MAX_BYTES).toBe(10485760);
    expect(LISTING_PHOTO_ACCEPT).toBe("image/jpeg,image/png,image/webp");
  });
});

describe("listingPhotoUploadErrorMessage", () => {
  it.each([
    ["403", LISTING_PHOTO_MESSAGES.not_landlord],
    ["413", LISTING_PHOTO_MESSAGES.too_big],
    ["415", LISTING_PHOTO_MESSAGES.wrong_type],
    ["500", LISTING_PHOTO_MESSAGES.failed],
    [undefined, LISTING_PHOTO_MESSAGES.failed], // e.g. no connection
  ])("says what Storage's %j means", (statusCode, message) => {
    expect(listingPhotoUploadErrorMessage(statusCode)).toBe(message);
  });
});
