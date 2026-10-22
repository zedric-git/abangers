import { compressImage, type Area, type Size } from "@/lib/compress-image";

/**
 * Getting a photo of a landlord's ID ready on the Verify account page
 * (S1-15.5, #203), as soon as they pick it with IdPhotoPicker.
 *
 * prepareIdPhoto() opens the photo the right way up and compresses it to a
 * JPEG of at most 1600 px and 1 MB (compressImage, src/lib/compress-image.ts,
 * the same as the selfie). So:
 * - a phone photo over the bucket's 5 MB limit is fine;
 * - the preview shows exactly what will be uploaded;
 * - the upload stays small on mobile data.
 * Nothing is uploaded here: submitVerification does that on Submit.
 *
 * Unlike the selfie (SelfieCamera, #202), any photo of the ID is fine, from
 * the camera or the gallery. Whatever the browser can open works (JPEG,
 * PNG, WebP, GIF, ...), because it's turned into a JPEG anyway.
 *
 * The browser does the opening and compressing (decode and compress in
 * IdPhotoTools below); the tests in id-photo.test.ts pass fakes instead,
 * like compressWithEncoder's encoder.
 */

/** Why a picked photo can't be used. */
export type IdPhotoProblem = "not_image" | "heic" | "unreadable" | "failed";

/**
 * What the landlord is told for each problem (#203's plan). A Record, so a
 * new IdPhotoProblem can't be added without its message.
 */
export const ID_PHOTO_PROBLEM_MESSAGES: Record<IdPhotoProblem, string> = {
  // e.g. a PDF of the ID
  not_image: "That file isn't a photo. Choose a JPEG, PNG or WebP image.",
  // Safari can open HEIC photos; most other browsers can't.
  heic: "This browser can't open HEIC photos (the iPhone's usual format). Choose a JPEG or PNG instead, or open this page in Safari.",
  unreadable:
    "We couldn't open this photo. Choose another one (JPEG, PNG or WebP).",
  // The canvas couldn't make the JPEG: rare, e.g. the browser ran out of
  // memory.
  failed: "We couldn't prepare this photo. Try again, or choose another one.",
};

export type PrepareIdPhotoResult =
  | { ok: true; photo: File }
  | { ok: false; problem: IdPhotoProblem; message: string };

/** What prepareIdPhoto() needs the browser for. The tests pass fakes. */
export interface IdPhotoTools {
  /** Opens the photo, the right way up. Fails if the browser can't. */
  decode: (file: File) => Promise<ImageBitmap>;
  /** The whole picture as a compressed JPEG File called `fileName`. */
  compress: (picture: ImageBitmap, fileName: string) => Promise<File>;
}

/** All of a picture: compressImage() takes the part to keep. */
export function wholeArea(size: Size): Area {
  return { x: 0, y: 0, width: size.width, height: size.height };
}

/** The real thing: the browser's own image decoder, and a canvas. */
export const browserIdPhotoTools: IdPhotoTools = {
  // "from-image" turns the picture the way the photo's EXIF data says, so
  // a phone photo taken sideways isn't shown (and sent) sideways.
  decode: (file) => createImageBitmap(file, { imageOrientation: "from-image" }),
  compress: (picture, fileName) =>
    compressImage(picture, wholeArea(picture), { fileName }),
};

/**
 * True for a HEIC/HEIF photo (an iPhone's usual format), going by its
 * type or, when the browser gives no type, its name.
 */
export function isHeic(file: File): boolean {
  return (
    /^image\/hei[cf](-sequence)?$/i.test(file.type) ||
    /\.hei[cf]$/i.test(file.name)
  );
}

/**
 * True when the browser says the file is something other than an image,
 * e.g. a PDF. A file with no type is still tried: some browsers don't
 * know the type of a photo they can't open, e.g. HEIC on Windows.
 */
export function isClearlyNotAnImage(file: File): boolean {
  return file.type !== "" && !file.type.startsWith("image/");
}

function cannotUse(problem: IdPhotoProblem): PrepareIdPhotoResult {
  return { ok: false, problem, message: ID_PHOTO_PROBLEM_MESSAGES[problem] };
}

/**
 * Opens `file` and compresses it to a JPEG File called `fileName` (e.g.
 * "id-front.jpg"), or says why it can't be used. Never throws.
 */
export async function prepareIdPhoto(
  file: File,
  fileName: string,
  tools: IdPhotoTools = browserIdPhotoTools,
): Promise<PrepareIdPhotoResult> {
  if (isClearlyNotAnImage(file)) {
    return cannotUse("not_image");
  }

  let picture: ImageBitmap;
  try {
    picture = await tools.decode(file);
  } catch (decodeError) {
    console.warn("Couldn't open the ID photo:", decodeError);
    return cannotUse(isHeic(file) ? "heic" : "unreadable");
  }

  try {
    return { ok: true, photo: await tools.compress(picture, fileName) };
  } catch (compressError) {
    console.error("Couldn't compress the ID photo:", compressError);
    return cannotUse("failed");
  } finally {
    // Frees the opened picture's memory now: a phone photo can take up
    // tens of MB once it's opened.
    picture.close();
  }
}
