/**
 * Opening the camera for the live selfie in landlord verification
 * (S1-15.4, #202). Used by SelfieCamera (src/components/SelfieCamera.tsx).
 *
 * The browser's camera API, navigator.mediaDevices.getUserMedia(), only
 * exists on secure pages: https, or http://localhost while developing. On
 * any other http page (e.g. a phone opening http://<your PC's IP>:3000)
 * it's missing, so SelfieCamera shows "This browser can't open the camera"
 * there. See "The camera only works on https or localhost" in AGENTS.md.
 */

/**
 * What can stop the camera from opening. SelfieCamera has a message for
 * each one.
 * - blocked: the landlord said no, or the browser or device blocks it
 * - no_camera: there's no camera to open
 * - in_use: there's a camera, but another app is using it
 * - unsupported: this browser (or this http page) has no camera API
 * - failed: anything else, including the camera stopping while it's on
 */
export type CameraProblem =
  "blocked" | "no_camera" | "in_use" | "unsupported" | "failed";

/**
 * What SelfieCamera asks the browser for: the front camera (facingMode
 * "user": the one facing the person holding the phone), ideally Full HD,
 * and no microphone.
 *
 * Every part is a preference, not a requirement: a bare facingMode and
 * `ideal` sizes let the browser pick the closest camera it has. So a
 * laptop's only webcam, or a smaller one, still opens, instead of failing
 * with an OverconstrainedError.
 */
export const SELFIE_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: "user",
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
  audio: false,
};

/**
 * Whether this browser, on this page, has a camera API at all. Takes the
 * browser's `navigator` (an argument, so the tests can pass their own).
 */
export function hasCameraApi(
  nav: { mediaDevices?: { getUserMedia?: unknown } } | undefined,
): boolean {
  return typeof nav?.mediaDevices?.getUserMedia === "function";
}

/**
 * Which problem a failed getUserMedia() call is. The browser rejects with
 * an error whose `name` says what happened (usually a DOMException). Older
 * browsers used other names for the same things: those are listed too.
 */
export function cameraProblemFrom(error: unknown): CameraProblem {
  const name =
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
      ? error.name
      : "";

  switch (name) {
    // The landlord chose Block (or closed the question), or the browser,
    // the phone or computer's settings, or the page doesn't allow it.
    case "NotAllowedError":
    case "PermissionDeniedError": // older Chrome
    case "SecurityError":
      return "blocked";

    // No camera at all, or none that can give what was asked for (unlikely:
    // SELFIE_CAMERA_CONSTRAINTS only has preferences).
    case "NotFoundError":
    case "DevicesNotFoundError": // older Chrome
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError": // older Chrome
      return "no_camera";

    // There's a camera, but it couldn't be started. Usually another app
    // (Zoom, Messenger, Teams, ...) is using it.
    case "NotReadableError":
    case "TrackStartError": // older Chrome
      return "in_use";

    default:
      return "failed";
  }
}
