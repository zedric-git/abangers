import { describe, expect, it } from "vitest";
import {
  cameraProblemFrom,
  hasCameraApi,
  SELFIE_CAMERA_CONSTRAINTS,
  type CameraProblem,
} from "./camera";

describe("cameraProblemFrom (a getUserMedia error -> what SelfieCamera says)", () => {
  // The errors browsers reject getUserMedia() with: DOMExceptions named
  // after what happened. The older names are what older Chrome used.
  it.each<[string, CameraProblem]>([
    ["NotAllowedError", "blocked"],
    ["PermissionDeniedError", "blocked"],
    ["SecurityError", "blocked"],
    ["NotFoundError", "no_camera"],
    ["DevicesNotFoundError", "no_camera"],
    ["OverconstrainedError", "no_camera"],
    ["ConstraintNotSatisfiedError", "no_camera"],
    ["NotReadableError", "in_use"],
    ["TrackStartError", "in_use"],
    ["AbortError", "failed"],
    ["TypeError", "failed"],
    ["InvalidStateError", "failed"],
  ])("%s -> %s", (name, problem) => {
    expect(cameraProblemFrom(new DOMException("camera error", name))).toBe(
      problem,
    );
  });

  it("reads the name of any error object, not only DOMExceptions", () => {
    // Chrome rejects with an OverconstrainedError object, not a
    // DOMException; a plain Error with the same name means the same thing.
    const overconstrained = Object.assign(new Error("no such camera"), {
      name: "OverconstrainedError",
    });
    expect(cameraProblemFrom(overconstrained)).toBe("no_camera");
    expect(cameraProblemFrom({ name: "NotAllowedError" })).toBe("blocked");
  });

  it("says 'failed' for anything it doesn't recognise", () => {
    expect(cameraProblemFrom(new Error("something broke"))).toBe("failed");
    expect(cameraProblemFrom("NotAllowedError")).toBe("failed");
    expect(cameraProblemFrom({ name: 42 })).toBe("failed");
    expect(cameraProblemFrom({})).toBe("failed");
    expect(cameraProblemFrom(null)).toBe("failed");
    expect(cameraProblemFrom(undefined)).toBe("failed");
  });

  it("never says 'unsupported': that's decided before asking (hasCameraApi)", () => {
    expect(
      cameraProblemFrom(new TypeError("getUserMedia is not a function")),
    ).toBe("failed");
  });
});

describe("hasCameraApi", () => {
  it("is true when the browser has navigator.mediaDevices.getUserMedia", () => {
    expect(
      hasCameraApi({ mediaDevices: { getUserMedia: async () => undefined } }),
    ).toBe(true);
  });

  it("is false on an http page or an old browser (no mediaDevices)", () => {
    expect(hasCameraApi({})).toBe(false);
    expect(hasCameraApi({ mediaDevices: {} })).toBe(false);
    expect(hasCameraApi(undefined)).toBe(false);
  });
});

describe("SELFIE_CAMERA_CONSTRAINTS", () => {
  it("asks for the front camera and no microphone", () => {
    expect(SELFIE_CAMERA_CONSTRAINTS.audio).toBe(false);
    expect(SELFIE_CAMERA_CONSTRAINTS.video).toMatchObject({
      facingMode: "user",
    });
  });

  it("only has preferences, so any camera still opens", () => {
    // `exact`, `min` or `max` would make the browser refuse a camera that
    // can't meet them (OverconstrainedError) instead of using it anyway.
    expect(JSON.stringify(SELFIE_CAMERA_CONSTRAINTS)).not.toMatch(
      /"(exact|min|max)"/,
    );
  });
});
