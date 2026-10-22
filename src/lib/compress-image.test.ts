import { describe, expect, it } from "vitest";
import {
  VERIFICATION_PHOTO_MAX_BYTES,
  verificationSubmissionSchema,
} from "@/lib/validations/verification";
import {
  centerCrop,
  COMPRESSED_PHOTO_MAX_BYTES,
  COMPRESSED_PHOTO_MAX_SIDE,
  COMPRESSED_PHOTO_MIN_SIDE,
  compressionAttempts,
  compressWithEncoder,
  fitWithin,
  JPEG_QUALITIES,
  type Attempt,
  type Encoder,
  type Size,
} from "./compress-image";

const MB = 1024 * 1024;

describe("fitWithin", () => {
  it("scales a wide photo down to the longest side", () => {
    expect(fitWithin({ width: 4000, height: 3000 }, 1600)).toEqual({
      width: 1600,
      height: 1200,
    });
  });

  it("scales a tall photo down to the longest side", () => {
    expect(fitWithin({ width: 3024, height: 4032 }, 1600)).toEqual({
      width: 1200,
      height: 1600,
    });
  });

  it("scales a square photo down", () => {
    expect(fitWithin({ width: 4000, height: 4000 }, 1600)).toEqual({
      width: 1600,
      height: 1600,
    });
  });

  it("never makes a photo bigger", () => {
    expect(fitWithin({ width: 540, height: 720 }, 1600)).toEqual({
      width: 540,
      height: 720,
    });
    expect(fitWithin({ width: 1600, height: 900 }, 1600)).toEqual({
      width: 1600,
      height: 900,
    });
  });

  it("rounds to whole pixels, and never to 0", () => {
    // 1081 * 1600 / 1921 = 900.36...
    expect(fitWithin({ width: 1081, height: 1921 }, 1600)).toEqual({
      width: 900,
      height: 1600,
    });
    // 1 * 1600 / 5000 = 0.32
    expect(fitWithin({ width: 5000, height: 1 }, 1600)).toEqual({
      width: 1600,
      height: 1,
    });
  });
});

describe("centerCrop (what SelfieCamera's 3:4 box shows)", () => {
  it("cuts off the sides of a wide (16:9) laptop webcam picture", () => {
    expect(centerCrop({ width: 1280, height: 720 }, 3 / 4)).toEqual({
      x: 370,
      y: 0,
      width: 540,
      height: 720,
    });
  });

  it("cuts off the top and bottom of a tall (9:16) phone picture", () => {
    expect(centerCrop({ width: 1080, height: 1920 }, 3 / 4)).toEqual({
      x: 0,
      y: 240,
      width: 1080,
      height: 1440,
    });
  });

  it("keeps all of a picture that's already 3:4", () => {
    expect(centerCrop({ width: 1080, height: 1440 }, 3 / 4)).toEqual({
      x: 0,
      y: 0,
      width: 1080,
      height: 1440,
    });
  });

  it.each<Size>([
    { width: 641, height: 479 },
    { width: 479, height: 641 },
    { width: 1919, height: 1081 },
    { width: 1000, height: 3 },
    { width: 3, height: 1000 },
    { width: 1, height: 1 },
  ])("stays inside a $width x $height picture, in whole pixels", (frame) => {
    const area = centerCrop(frame, 3 / 4);

    for (const value of Object.values(area)) {
      expect(Number.isInteger(value)).toBe(true);
    }
    expect(area.x).toBeGreaterThanOrEqual(0);
    expect(area.y).toBeGreaterThanOrEqual(0);
    expect(area.width).toBeGreaterThanOrEqual(1);
    expect(area.height).toBeGreaterThanOrEqual(1);
    expect(area.x + area.width).toBeLessThanOrEqual(frame.width);
    expect(area.y + area.height).toBeLessThanOrEqual(frame.height);
    // 3:4, give or take the rounding to whole pixels.
    expect(Math.abs(area.width - (area.height * 3) / 4)).toBeLessThanOrEqual(1);
  });
});

describe("compressionAttempts", () => {
  // A 12 MP phone photo, taken upright.
  const phonePhoto = { width: 3024, height: 4032 };

  it("lowers the quality first, then the size, and stops above 640 px", () => {
    expect(compressionAttempts(phonePhoto)).toEqual([
      { width: 1200, height: 1600, quality: 0.85 },
      { width: 1200, height: 1600, quality: 0.75 },
      { width: 1200, height: 1600, quality: 0.65 },
      { width: 960, height: 1280, quality: 0.65 },
      { width: 768, height: 1024, quality: 0.65 },
      { width: 614, height: 819, quality: 0.65 },
      { width: 491, height: 655, quality: 0.65 },
      // The next one, 524 px, would be under COMPRESSED_PHOTO_MIN_SIDE.
    ]);
  });

  it("never goes up in size or quality, or below the minimum size", () => {
    const attempts = compressionAttempts(phonePhoto);

    expect(attempts[0]).toEqual({
      ...fitWithin(phonePhoto, COMPRESSED_PHOTO_MAX_SIDE),
      quality: JPEG_QUALITIES[0],
    });
    attempts.slice(1).forEach((attempt, index) => {
      const previous = attempts[index];
      expect(attempt.width).toBeLessThanOrEqual(previous.width);
      expect(attempt.height).toBeLessThanOrEqual(previous.height);
      expect(attempt.quality).toBeLessThanOrEqual(previous.quality);
    });
    for (const attempt of attempts) {
      expect(Math.max(attempt.width, attempt.height)).toBeGreaterThanOrEqual(
        COMPRESSED_PHOTO_MIN_SIDE,
      );
    }
  });

  it("only tries a small photo at its own size", () => {
    // What a 1280x720 webcam gives after the 3:4 crop.
    expect(compressionAttempts({ width: 540, height: 720 })).toEqual(
      JPEG_QUALITIES.map((quality) => ({ width: 540, height: 720, quality })),
    );
  });

  it("starts from a smaller maxSide when asked", () => {
    expect(compressionAttempts({ width: 4000, height: 3000 }, 1000)).toEqual([
      { width: 1000, height: 750, quality: 0.85 },
      { width: 1000, height: 750, quality: 0.75 },
      { width: 1000, height: 750, quality: 0.65 },
      { width: 800, height: 600, quality: 0.65 },
      { width: 640, height: 480, quality: 0.65 },
    ]);
  });
});

/**
 * A stand-in for the canvas: "saves" a JPEG of `bytesFor(attempt)` bytes
 * and records each attempt it was asked for.
 */
function fakeEncoder(bytesFor: (attempt: Attempt) => number) {
  const tried: Attempt[] = [];
  const encode: Encoder = async (attempt) => {
    tried.push(attempt);
    return new Blob([new Uint8Array(bytesFor(attempt))], {
      type: "image/jpeg",
    });
  };
  return { encode, tried };
}

/** Like a real JPEG: more pixels and a higher quality make a bigger file. */
function bytesPerPixel(bytes: number) {
  return (attempt: Attempt) =>
    Math.round(attempt.width * attempt.height * bytes * attempt.quality);
}

describe("compressWithEncoder", () => {
  // What SelfieCamera gets from a 1080x1920 phone camera: the 3:4 crop.
  const selfieSize = { width: 1080, height: 1440 };
  const options = { fileName: "selfie.jpg" };

  it("stops at the first try when it already fits", async () => {
    const { encode, tried } = fakeEncoder(bytesPerPixel(0.2));

    const photo = await compressWithEncoder(encode, selfieSize, options);

    expect(tried).toEqual([{ width: 1080, height: 1440, quality: 0.85 }]);
    // 1080 * 1440 * 0.2 * 0.85
    expect(photo.size).toBe(264384);
  });

  it("lowers the quality when the first try is over 1 MB", async () => {
    const { encode, tried } = fakeEncoder(bytesPerPixel(0.9));

    const photo = await compressWithEncoder(encode, selfieSize, options);

    // 1080 * 1440 * 0.9 = 1,399,680 bytes before the quality:
    // 0.85 -> 1,189,728 (too big), 0.75 -> 1,049,760 (too big),
    // 0.65 -> 909,792 (fits).
    expect(tried.map((attempt) => attempt.quality)).toEqual([0.85, 0.75, 0.65]);
    expect(photo.size).toBe(909792);
    expect(photo.size).toBeLessThanOrEqual(COMPRESSED_PHOTO_MAX_BYTES);
  });

  it("makes it smaller once the lowest quality is still too big", async () => {
    const { encode, tried } = fakeEncoder(bytesPerPixel(2));

    const photo = await compressWithEncoder(
      encode,
      { width: 3024, height: 4032 },
      options,
    );

    expect(tried.at(-1)).toEqual({ width: 768, height: 1024, quality: 0.65 });
    expect(tried).toHaveLength(5);
    expect(photo.size).toBeLessThanOrEqual(COMPRESSED_PHOTO_MAX_BYTES);
  });

  it("fails when even the smallest try is too big", async () => {
    const { encode, tried } = fakeEncoder(() => COMPRESSED_PHOTO_MAX_BYTES + 1);

    await expect(
      compressWithEncoder(encode, { width: 3024, height: 4032 }, options),
    ).rejects.toThrow("Couldn't make the photo 1048576 bytes or smaller");
    expect(tried).toEqual(compressionAttempts({ width: 3024, height: 4032 }));
  });

  it("stops if the encoder fails (e.g. the canvas couldn't save)", async () => {
    let calls = 0;
    const failing: Encoder = async () => {
      calls += 1;
      throw new Error("The browser couldn't save the photo as a JPEG");
    };

    await expect(
      compressWithEncoder(failing, selfieSize, options),
    ).rejects.toThrow("couldn't save the photo");
    expect(calls).toBe(1);
  });

  it("hands over a File that the verification schema accepts as a selfie", async () => {
    const { encode } = fakeEncoder(bytesPerPixel(0.2));

    const photo = await compressWithEncoder(encode, selfieSize, options);

    // A File, not a bare Blob: z.file() refuses Blobs (#204).
    expect(photo).toBeInstanceOf(File);
    expect(photo.name).toBe("selfie.jpg");
    expect(photo.type).toBe("image/jpeg");
    expect(
      verificationSubmissionSchema.shape.selfie.safeParse(photo).success,
    ).toBe(true);
  });

  it("uses a smaller maxBytes when asked", async () => {
    const { encode } = fakeEncoder(bytesPerPixel(0.2));

    const photo = await compressWithEncoder(encode, selfieSize, {
      ...options,
      maxBytes: 100_000,
    });

    expect(photo.size).toBeLessThanOrEqual(100_000);
  });

  it("never goes over the bucket's 5 MB, even if a bigger maxBytes is passed", async () => {
    // 1080 * 1440 * 5 = 7,776,000 bytes before the quality: 0.85 and 0.75
    // are over 5 MB (5,242,880), 0.65 -> 5,054,400 is the first that fits.
    const { encode, tried } = fakeEncoder(bytesPerPixel(5));

    const photo = await compressWithEncoder(encode, selfieSize, {
      ...options,
      maxBytes: 50 * MB,
    });

    expect(tried.map((attempt) => attempt.quality)).toEqual([0.85, 0.75, 0.65]);
    expect(photo.size).toBeLessThanOrEqual(VERIFICATION_PHOTO_MAX_BYTES);
  });
});

describe("the limits", () => {
  it("compresses to 1 MB by default, well within the bucket's 5 MB", () => {
    expect(COMPRESSED_PHOTO_MAX_BYTES).toBe(1 * MB);
    expect(COMPRESSED_PHOTO_MAX_BYTES).toBeLessThanOrEqual(
      VERIFICATION_PHOTO_MAX_BYTES,
    );
  });

  it("keeps the minimum size below the maximum, and the qualities best first", () => {
    expect(COMPRESSED_PHOTO_MIN_SIDE).toBeLessThan(COMPRESSED_PHOTO_MAX_SIDE);
    expect(JPEG_QUALITIES).toEqual([...JPEG_QUALITIES].sort((a, b) => b - a));
    for (const quality of JPEG_QUALITIES) {
      expect(quality).toBeGreaterThan(0);
      expect(quality).toBeLessThanOrEqual(1);
    }
  });
});
