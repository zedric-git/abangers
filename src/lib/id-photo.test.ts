import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verificationSubmissionSchema } from "@/lib/validations/verification";
import {
  browserIdPhotoTools,
  ID_PHOTO_PROBLEM_MESSAGES,
  isClearlyNotAnImage,
  isHeic,
  prepareIdPhoto,
  wholeArea,
  type IdPhotoProblem,
  type IdPhotoTools,
} from "./id-photo";

/** A file the landlord picked. Only its type and name matter here. */
function picked(type: string, name = "photo") {
  return new File([new Uint8Array(100)], name, { type });
}

/**
 * Stands in for the browser: decode "opens" any file as a 4000 x 3000
 * picture, and compress returns a small JPEG with the name it's given.
 * Every call is recorded.
 */
function fakeTools() {
  const picture = {
    width: 4000,
    height: 3000,
    close: vi.fn(),
  } as unknown as ImageBitmap;

  const tools = {
    decode: vi.fn(async () => picture),
    compress: vi.fn(
      async (_picture: ImageBitmap, fileName: string) =>
        new File([new Uint8Array(300 * 1024)], fileName, {
          type: "image/jpeg",
        }),
    ),
  } satisfies IdPhotoTools;

  return { tools, picture };
}

beforeEach(() => {
  // prepareIdPhoto logs what went wrong; keep the test output clean.
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("prepareIdPhoto", () => {
  it.each(["image/jpeg", "image/png", "image/webp", "image/gif"])(
    "turns a %s photo into a compressed JPEG File",
    async (type) => {
      const { tools, picture } = fakeTools();
      const file = picked(type);

      const result = await prepareIdPhoto(file, "id-front.jpg", tools);

      expect(result.ok).toBe(true);
      expect(tools.decode).toHaveBeenCalledWith(file);
      expect(tools.compress).toHaveBeenCalledWith(picture, "id-front.jpg");
      if (result.ok) {
        expect(result.photo).toBeInstanceOf(File);
        expect(result.photo.name).toBe("id-front.jpg");
        expect(result.photo.type).toBe("image/jpeg");
      }
    },
  );

  it("hands over a photo that the verification schema accepts", async () => {
    const { tools } = fakeTools();

    const result = await prepareIdPhoto(
      picked("image/png"),
      "id-back.jpg",
      tools,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const { id_front, id_back } = verificationSubmissionSchema.shape;
      expect(id_front.safeParse(result.photo).success).toBe(true);
      expect(id_back.safeParse(result.photo).success).toBe(true);
    }
  });

  it("refuses a file that isn't an image without opening it", async () => {
    const { tools } = fakeTools();

    const result = await prepareIdPhoto(
      picked("application/pdf", "my-id.pdf"),
      "id-front.jpg",
      tools,
    );

    expect(result).toEqual({
      ok: false,
      problem: "not_image",
      message: ID_PHOTO_PROBLEM_MESSAGES.not_image,
    });
    expect(tools.decode).not.toHaveBeenCalled();
    expect(tools.compress).not.toHaveBeenCalled();
  });

  it("still tries a file the browser gave no type", async () => {
    const { tools } = fakeTools();

    const result = await prepareIdPhoto(picked(""), "id-front.jpg", tools);

    expect(result.ok).toBe(true);
    expect(tools.decode).toHaveBeenCalledOnce();
  });

  it("says when the browser can't open the photo", async () => {
    const { tools } = fakeTools();
    tools.decode.mockRejectedValue(new Error("could not be decoded"));

    const result = await prepareIdPhoto(
      picked("image/tiff", "scan.tiff"),
      "id-front.jpg",
      tools,
    );

    expect(result).toMatchObject({ ok: false, problem: "unreadable" });
    expect(tools.compress).not.toHaveBeenCalled();
  });

  it.each([
    ["image/heic", "IMG_0001.HEIC"],
    ["image/heif", "IMG_0001.HEIF"],
    ["", "IMG_0001.heic"], // Windows doesn't always know the type
  ])(
    "says HEIC photos don't open in this browser (%j, %s)",
    async (type, name) => {
      const { tools } = fakeTools();
      tools.decode.mockRejectedValue(new Error("could not be decoded"));

      const result = await prepareIdPhoto(
        picked(type, name),
        "id-front.jpg",
        tools,
      );

      expect(result).toMatchObject({ ok: false, problem: "heic" });
      if (!result.ok) {
        expect(result.message).toContain("Safari");
      }
    },
  );

  it("uses a HEIC photo the browser can open (Safari)", async () => {
    const { tools } = fakeTools();

    const result = await prepareIdPhoto(
      picked("image/heic", "IMG_0001.HEIC"),
      "id-front.jpg",
      tools,
    );

    expect(result.ok).toBe(true);
  });

  it("says when the photo couldn't be compressed", async () => {
    const { tools } = fakeTools();
    tools.compress.mockRejectedValue(new Error("no canvas"));

    const result = await prepareIdPhoto(
      picked("image/jpeg"),
      "id-front.jpg",
      tools,
    );

    expect(result).toMatchObject({ ok: false, problem: "failed" });
  });

  it("always frees the opened picture", async () => {
    const worked = fakeTools();
    await prepareIdPhoto(picked("image/jpeg"), "id-front.jpg", worked.tools);
    expect(worked.picture.close).toHaveBeenCalledOnce();

    const failed = fakeTools();
    failed.tools.compress.mockRejectedValue(new Error("no canvas"));
    await prepareIdPhoto(picked("image/jpeg"), "id-front.jpg", failed.tools);
    expect(failed.picture.close).toHaveBeenCalledOnce();
  });
});

describe("the browser's tools", () => {
  it("open photos the right way up (EXIF orientation)", async () => {
    const createImageBitmap = vi.fn(async () => ({}) as ImageBitmap);
    vi.stubGlobal("createImageBitmap", createImageBitmap);
    const file = picked("image/jpeg");

    await browserIdPhotoTools.decode(file);

    expect(createImageBitmap).toHaveBeenCalledWith(file, {
      imageOrientation: "from-image",
    });
  });

  it("compress the whole picture, not a part of it", () => {
    expect(wholeArea({ width: 4000, height: 3000 })).toEqual({
      x: 0,
      y: 0,
      width: 4000,
      height: 3000,
    });
  });
});

describe("telling files apart", () => {
  it.each([
    ["image/heic", "a.heic", true],
    ["image/heif", "a.heif", true],
    ["image/heic-sequence", "a.heics", true],
    ["", "IMG_0001.HEIC", true],
    ["image/jpeg", "IMG_0001.jpg", false],
    ["", "photo", false],
  ])("isHeic(%j, %s) is %s", (type, name, expected) => {
    expect(isHeic(picked(type, name))).toBe(expected);
  });

  it.each([
    ["application/pdf", true],
    ["text/plain", true],
    ["image/jpeg", false],
    ["image/heic", false],
    ["", false],
  ])("isClearlyNotAnImage(%j) is %s", (type, expected) => {
    expect(isClearlyNotAnImage(picked(type))).toBe(expected);
  });

  it("has a different message for every problem", () => {
    const problems = Object.keys(ID_PHOTO_PROBLEM_MESSAGES) as IdPhotoProblem[];
    const messages = problems.map((p) => ID_PHOTO_PROBLEM_MESSAGES[p]);

    expect(problems.sort()).toEqual(
      ["failed", "heic", "not_image", "unreadable"].sort(),
    );
    expect(new Set(messages).size).toBe(messages.length);
    for (const message of messages) {
      expect(message).not.toBe("");
    }
  });
});
