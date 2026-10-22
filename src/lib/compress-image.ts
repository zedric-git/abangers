import { VERIFICATION_PHOTO_MAX_BYTES } from "@/lib/validations/verification";

/**
 * Making verification photos smaller before they're uploaded (S1-15.4,
 * #202): the live selfie from SelfieCamera, and the ID photos on the
 * Verify account page (#203).
 *
 * compressImage() draws the photo on a canvas, no bigger than
 * COMPRESSED_PHOTO_MAX_SIDE, and saves it as a JPEG. If that's still more
 * than maxBytes (1 MB unless the caller says otherwise), it tries lower
 * qualities, then smaller and smaller sizes. The result is usually a few
 * hundred KB: quick to upload on mobile data, and always within the
 * verification-documents bucket's 5 MB limit (VERIFICATION_PHOTO_MAX_BYTES).
 *
 * The decisions (the sizes, the crop, what to try next) are plain
 * functions, unit-tested in compress-image.test.ts. Only compressImage()
 * itself needs a browser, because it draws on a canvas.
 */

/** A width and a height, in pixels. */
export interface Size {
  width: number;
  height: number;
}

/** A rectangle of a picture: its top-left corner (x, y) and its size. */
export interface Area extends Size {
  x: number;
  y: number;
}

/** One try: the size to save the photo at, and the JPEG quality (0-1). */
export interface Attempt extends Size {
  quality: number;
}

/** The longest side a compressed photo can have: enough to read an ID or compare a face. */
export const COMPRESSED_PHOTO_MAX_SIDE = 1600;

/**
 * The smallest the longest side may get while trying to fit maxBytes.
 * Below this a face or an ID is too hard to check, so it gives up instead.
 */
export const COMPRESSED_PHOTO_MIN_SIDE = 640;

/** How big a compressed photo may be unless the caller says otherwise: 1 MB. */
export const COMPRESSED_PHOTO_MAX_BYTES = 1024 * 1024;

/** The JPEG qualities tried at full size, best first (1 is the best). */
export const JPEG_QUALITIES = [0.85, 0.75, 0.65];

/** Once the lowest quality is too big, each next try is 80% of the size. */
const SHRINK_FACTOR = 0.8;

export interface CompressOptions {
  /** The new file's name, e.g. "selfie.jpg". */
  fileName: string;
  /**
   * The most the file may weigh, in bytes: COMPRESSED_PHOTO_MAX_BYTES
   * (1 MB) if left out. Never more than the bucket's 5 MB, even if a
   * bigger number is passed.
   */
  maxBytes?: number;
  /** The longest side, in pixels: COMPRESSED_PHOTO_MAX_SIDE if left out. */
  maxSide?: number;
}

/**
 * `size` scaled down so that its longest side is at most `maxSide`,
 * keeping its shape. Never scaled up: a photo that's already small enough
 * keeps its size. Whole pixels, and never 0.
 */
export function fitWithin(size: Size, maxSide: number): Size {
  const longestSide = Math.max(size.width, size.height);
  const scale = longestSide > maxSide ? maxSide / longestSide : 1;

  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/**
 * The biggest part of a `frame` that has the shape `aspect` (width divided
 * by height, e.g. 3 / 4 for portrait), taken from its middle. SelfieCamera
 * uses it to send exactly what its 3:4 box shows: the box shows the middle
 * of the camera's picture, cut to fit (CSS object-fit: cover).
 */
export function centerCrop(frame: Size, aspect: number): Area {
  let width: number;
  let height: number;

  if (frame.width / frame.height > aspect) {
    // Wider than the shape: keep the full height, cut off the sides.
    height = frame.height;
    width = Math.max(1, Math.round(frame.height * aspect));
  } else {
    // Taller than the shape (or the same): keep the full width, cut off
    // the top and bottom.
    width = frame.width;
    height = Math.max(1, Math.round(frame.width / aspect));
  }

  return {
    x: Math.floor((frame.width - width) / 2),
    y: Math.floor((frame.height - height) / 2),
    width,
    height,
  };
}

/**
 * What compressImage() tries, in order, until a JPEG fits in maxBytes:
 * 1. the photo scaled to fit `maxSide`, at each of JPEG_QUALITIES;
 * 2. then 80% smaller each time, at the lowest quality, while its longest
 *    side is still at least COMPRESSED_PHOTO_MIN_SIDE.
 * A photo that's already smaller than that is only tried at its own size.
 */
export function compressionAttempts(
  size: Size,
  maxSide: number = COMPRESSED_PHOTO_MAX_SIDE,
): Attempt[] {
  const fullSize = fitWithin(size, maxSide);
  const attempts: Attempt[] = JPEG_QUALITIES.map((quality) => ({
    ...fullSize,
    quality,
  }));

  const lowestQuality = JPEG_QUALITIES[JPEG_QUALITIES.length - 1];
  let longestSide = Math.round(
    Math.max(fullSize.width, fullSize.height) * SHRINK_FACTOR,
  );
  while (longestSide >= COMPRESSED_PHOTO_MIN_SIDE) {
    attempts.push({
      ...fitWithin(fullSize, longestSide),
      quality: lowestQuality,
    });
    longestSide = Math.round(longestSide * SHRINK_FACTOR);
  }

  return attempts;
}

/**
 * Saves the photo at one attempt's size and quality. compressImage() passes
 * one that draws on a canvas; the tests pass a fake.
 */
export type Encoder = (attempt: Attempt) => Promise<Blob>;

/**
 * Tries compressionAttempts(size) one at a time with `encode`, and returns
 * the first result that fits in maxBytes, as a File. Throws if none fits.
 */
export async function compressWithEncoder(
  encode: Encoder,
  size: Size,
  options: CompressOptions,
): Promise<File> {
  const maxBytes = Math.min(
    options.maxBytes ?? COMPRESSED_PHOTO_MAX_BYTES,
    VERIFICATION_PHOTO_MAX_BYTES,
  );

  for (const attempt of compressionAttempts(size, options.maxSide)) {
    const blob = await encode(attempt);
    if (blob.size <= maxBytes) {
      // A File, not the bare Blob: verificationSubmissionSchema only
      // accepts Files (#204).
      return new File([blob], options.fileName, { type: blob.type });
    }
  }

  throw new Error(`Couldn't make the photo ${maxBytes} bytes or smaller`);
}

/**
 * Compresses `area` of `source` to a JPEG File that fits in maxBytes.
 * `source` is anything a canvas can draw: the <video> showing the camera
 * (SelfieCamera), or a photo the landlord picked, decoded first (#203):
 *
 *   const bitmap = await createImageBitmap(file);
 *   const area = { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
 *   const photo = await compressImage(bitmap, area, { fileName: "id-front.jpg" });
 *   bitmap.close();
 *
 * The area is copied straight away, once, at the biggest size it tries, so
 * the video can move on, or the camera be turned off, while it compresses.
 */
export async function compressImage(
  source: CanvasImageSource,
  area: Area,
  options: CompressOptions,
): Promise<File> {
  const fullSize = fitWithin(
    area,
    options.maxSide ?? COMPRESSED_PHOTO_MAX_SIDE,
  );
  const copy = drawOnCanvas(fullSize, (context) =>
    context.drawImage(
      source,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      fullSize.width,
      fullSize.height,
    ),
  );

  try {
    return await compressWithEncoder(
      (attempt) => encodeJpeg(copy, attempt),
      fullSize,
      options,
    );
  } finally {
    freeCanvas(copy);
  }
}

/** A new canvas of `size`, white, with `draw` drawn on it. */
function drawOnCanvas(
  size: Size,
  draw: (context: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("This browser can't draw on a canvas");
  }

  // White behind the see-through parts of a PNG: a JPEG can't be
  // see-through, and they would turn black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size.width, size.height);
  // Smoother edges when the photo is scaled down.
  context.imageSmoothingQuality = "high";
  draw(context);

  return canvas;
}

/** `canvas` saved as a JPEG at the attempt's size and quality. */
function encodeJpeg(
  canvas: HTMLCanvasElement,
  attempt: Attempt,
): Promise<Blob> {
  const sameSize =
    attempt.width === canvas.width && attempt.height === canvas.height;
  const target = sameSize
    ? canvas
    : drawOnCanvas(attempt, (context) =>
        context.drawImage(canvas, 0, 0, attempt.width, attempt.height),
      );

  return new Promise((resolve, reject) => {
    target.toBlob(
      (blob) => {
        if (target !== canvas) freeCanvas(target);

        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("The browser couldn't save the photo as a JPEG"));
        }
      },
      "image/jpeg",
      attempt.quality,
    );
  });
}

/**
 * Frees a canvas's memory now instead of whenever the browser gets to it.
 * Safari on iPhones has a low limit for all canvases put together.
 */
function freeCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}
