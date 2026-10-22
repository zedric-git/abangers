"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  Loader2,
  MonitorX,
  RotateCcw,
  VideoOff,
} from "lucide-react";
import {
  cameraProblemFrom,
  hasCameraApi,
  SELFIE_CAMERA_CONSTRAINTS,
  type CameraProblem,
} from "@/lib/camera";
import { centerCrop, compressImage } from "@/lib/compress-image";
import { cn } from "@/lib/utils";

interface SelfieCameraProps {
  /** The selfie taken so far, or null. The Verify account form keeps it. */
  value: File | null;
  /** Gets the compressed selfie after Take photo, and null on Retake. */
  onChange: (selfie: File | null) => void;
  /** The form's message about the selfie, e.g. "Take a selfie". */
  error?: string;
  /** True while the form is submitting: the buttons can't be used. */
  disabled?: boolean;
}

/** The selfie's shape: portrait, 3 wide by 4 tall. The box and the photo. */
const SELFIE_ASPECT = 3 / 4;

/** The name of the File handed over. submitVerification names the upload. */
const SELFIE_FILE_NAME = "selfie.jpg";

/**
 * What each problem shows (#202's plan). A Record, so a new CameraProblem
 * can't be added without its message.
 */
const PROBLEMS: Record<
  CameraProblem,
  {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    message: string;
  }
> = {
  blocked: {
    icon: CameraOff,
    title: "Camera access is blocked",
    message:
      "Allow the camera for this site in your browser settings (and your device's settings), then try again.",
  },
  no_camera: {
    icon: VideoOff,
    title: "We couldn't find a camera",
    message: "Use a phone, or a computer with a webcam.",
  },
  in_use: {
    icon: CameraOff,
    title: "Another app is using your camera",
    message: "Close it (e.g. Zoom or Messenger), then try again.",
  },
  unsupported: {
    icon: MonitorX,
    title: "This browser can't open the camera",
    message: "Use an up-to-date Chrome, Safari, Edge or Firefox.",
  },
  failed: {
    icon: AlertCircle,
    title: "Something went wrong with your camera",
    message: "Try again, or reload the page.",
  },
};

// The same button styles as ListingSaveErrorModal's, plus a disabled look.
const SECONDARY_BUTTON =
  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white py-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";
const PRIMARY_BUTTON =
  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-700 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-purple-800 active:bg-purple-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700";

/**
 * What the camera box is doing:
 * - idle: the camera is off. Shows the selfie if there is one (`value`),
 *   or tips and Open camera if not.
 * - starting: waiting for the browser (and the landlord's Allow)
 * - live: the camera is on, and its picture is showing
 * - saving: the photo was taken and is being compressed
 * - problem: the camera couldn't open, or it stopped
 */
type CameraView =
  | { step: "idle" }
  | { step: "starting" }
  | { step: "live" }
  | { step: "saving" }
  | { step: "problem"; problem: CameraProblem };

/**
 * The camera's stream, and a count of the times it was asked for. One
 * object for the component's whole life (kept in a ref), so the handlers
 * and the cleanup always see the latest stream.
 */
interface CameraHandle {
  stream: MediaStream | null;
  /**
   * Goes up every time the camera is turned off (Cancel, the photo, Open
   * camera again, leaving the page). A camera the browser hands over after
   * that was asked for by an earlier request, so it's turned off at once.
   */
  request: number;
}

/** Turns the camera (and its light) off, and any camera still on its way. */
function turnOffCamera(camera: CameraHandle) {
  camera.request += 1;
  camera.stream?.getTracks().forEach((track) => track.stop());
  camera.stream = null;
}

/** What screen readers hear when the box changes. */
function statusText(view: CameraView, hasSelfie: boolean): string {
  switch (view.step) {
    case "starting":
      return "Opening your camera. If your browser asks, choose Allow.";
    case "live":
      return "Your camera is on. Fit your face inside the oval, then take the photo.";
    case "saving":
      return "Saving your photo.";
    case "idle":
      return hasSelfie ? "Selfie taken." : "";
    case "problem":
      // The problem itself is read out: it's an alert.
      return "";
  }
}

/**
 * The live-camera selfie for landlord verification (S1-15.4, #202), used by
 * the Verify account page (#203) for the `selfie` field of
 * verificationSubmissionSchema.
 *
 * - The landlord opens the front camera, sees themselves (mirrored, like a
 *   phone's camera app), and takes the photo. The camera only turns on
 *   when they click Open camera, and turns off as soon as the photo is
 *   taken, on Cancel, and when the component goes away.
 * - The photo is what the 3:4 box showed (centerCrop), not mirrored (so it
 *   matches the ID), and compressed to a JPEG File of at most 1 MB
 *   (compressImage, src/lib/compress-image.ts) before onChange gets it.
 * - There's no file picker, on purpose: no <input type="file">, not even
 *   with `capture`. On a computer that opens a file picker, and some
 *   phones let you choose a gallery photo from it, so it could be an old
 *   photo, or someone else's.
 * - If the camera can't open, it says why and what to do (PROBLEMS).
 *
 * The camera only works on https or localhost (see src/lib/camera.ts).
 */
export default function SelfieCamera({
  value,
  onChange,
  error,
  disabled = false,
}: SelfieCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<CameraHandle>({ stream: null, request: 0 });
  const [view, setView] = useState<CameraView>({ step: "idle" });
  // Whether the landlord has used the camera yet. Only then do the buttons
  // take the focus when they appear, so the page doesn't jump to the
  // camera when it loads.
  const [used, setUsed] = useState(false);

  // The selfie, as a data: URL (the photo's bytes written as text) for
  // <Image>. Unlike URL.createObjectURL(), it never needs freeing.
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(
    null,
  );
  useEffect(() => {
    if (!value) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreview({ file: value, url: reader.result });
      }
    };
    reader.readAsDataURL(value);

    return () => reader.abort();
  }, [value]);
  const previewUrl =
    value !== null && preview?.file === value ? preview.url : null;

  // Turn the camera off when the component goes away, e.g. when the
  // landlord leaves the page, even if it's still on its way.
  useEffect(() => {
    const camera = cameraRef.current;
    return () => turnOffCamera(camera);
  }, []);

  /** Turns the camera off and empties the picture. */
  function stopCamera() {
    turnOffCamera(cameraRef.current);
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function openCamera() {
    setUsed(true);
    stopCamera();

    if (!hasCameraApi(navigator)) {
      if (!window.isSecureContext) {
        console.warn(
          'The camera only works on https or localhost. See "The camera only works on https or localhost" in AGENTS.md.',
        );
      }
      setView({ step: "problem", problem: "unsupported" });
      return;
    }

    const camera = cameraRef.current;
    const request = camera.request;
    setView({ step: "starting" });

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(
        SELFIE_CAMERA_CONSTRAINTS,
      );
    } catch (cameraError) {
      if (request !== camera.request) return;
      console.warn("Couldn't open the camera:", cameraError);
      setView({ step: "problem", problem: cameraProblemFrom(cameraError) });
      return;
    }

    // Cancelled, opened again, or left while the browser was asking:
    // nobody wants this camera any more.
    if (request !== camera.request) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    camera.stream = stream;
    // If the camera stops by itself (unplugged, or taken back by the phone
    // or the browser), say so. track.stop() above doesn't count.
    stream.getVideoTracks().forEach((track) =>
      track.addEventListener("ended", () => {
        if (camera.stream !== stream) return;
        stopCamera();
        setView({ step: "problem", problem: "failed" });
      }),
    );

    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    // Set here as well as in the JSX: browsers only play a video by itself
    // when it's muted, and React doesn't always set `muted` on the element.
    video.muted = true;
    // autoPlay starts it too; some browsers need play(). The box shows the
    // camera once it's playing (onPlaying below).
    video.play().catch((playError: unknown) => {
      // Turned off or replaced before it started playing: nothing to do.
      const interrupted =
        playError instanceof DOMException && playError.name === "AbortError";
      if (request !== camera.request || interrupted) return;
      console.warn("Couldn't show the camera:", playError);
      stopCamera();
      setView({ step: "problem", problem: "failed" });
    });
  }

  async function takePhoto() {
    const video = videoRef.current;
    if (!video || view.step !== "live" || video.videoWidth === 0) return;

    const camera = cameraRef.current;
    const request = camera.request;
    setView({ step: "saving" });
    // Freeze the picture on the moment the photo was taken.
    video.pause();

    try {
      const area = centerCrop(
        { width: video.videoWidth, height: video.videoHeight },
        SELFIE_ASPECT,
      );
      const selfie = await compressImage(video, area, {
        fileName: SELFIE_FILE_NAME,
      });
      // Cancelled or left while it was saving.
      if (request !== camera.request) return;

      stopCamera();
      setView({ step: "idle" });
      onChange(selfie);
    } catch (saveError) {
      if (request !== camera.request) return;
      console.error("Couldn't save the selfie:", saveError);
      stopCamera();
      setView({ step: "problem", problem: "failed" });
    }
  }

  function cancel() {
    stopCamera();
    setView({ step: "idle" });
  }

  function retake() {
    onChange(null);
    void openCamera();
  }

  const cameraOn =
    view.step === "starting" || view.step === "live" || view.step === "saving";
  const showSelfie = view.step === "idle" && value !== null;
  const problem = view.step === "problem" ? PROBLEMS[view.problem] : null;
  const ProblemIcon = problem?.icon;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative mx-auto aspect-3/4 w-full max-w-sm overflow-hidden rounded-2xl border-2",
          cameraOn || showSelfie
            ? "border-transparent bg-zinc-900"
            : error
              ? "border-dashed border-red-300 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20"
              : "border-dashed border-zinc-300 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-800/40",
        )}
      >
        {/* The camera's picture. Always in the page (hidden while the
            camera is off), so the stream can be attached the moment it
            arrives. Mirrored with CSS, like a phone's camera app; the
            photo itself isn't mirrored. Screen readers get the status
            text below instead. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-hidden="true"
          onPlaying={() =>
            setView((current) =>
              current.step === "starting" ? { step: "live" } : current,
            )
          }
          className={cn(
            "h-full w-full -scale-x-100 object-cover",
            !cameraOn && "hidden",
          )}
        />

        {/* Live: an oval to put their face in. */}
        {view.step === "live" && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute top-[44%] left-1/2 h-[62%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-white/80 shadow-[0_0_0_100vmax_rgba(0,0,0,0.35)]" />
            <p className="absolute inset-x-0 bottom-4 px-4 text-center text-xs font-semibold text-white drop-shadow-md">
              Fit your face inside the oval
            </p>
          </div>
        )}

        {/* Opening the camera, or saving the photo. */}
        {(view.step === "starting" || view.step === "saving") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900/70 p-6 text-center text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm font-semibold">
              {view.step === "starting"
                ? "Opening your camera…"
                : "Saving your photo…"}
            </p>
            {view.step === "starting" && (
              <p className="text-xs text-zinc-300">
                If your browser asks, choose Allow.
              </p>
            )}
          </div>
        )}

        {/* The selfie, exactly as it will be sent. */}
        {showSelfie && (
          <>
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Your selfie"
                fill
                sizes="(max-width: 640px) 100vw, 384px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            <span className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-purple-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg dark:bg-purple-600">
              <CheckCircle2 className="h-3 w-3" />
              Selfie taken
            </span>
          </>
        )}

        {/* No selfie yet: tips. */}
        {view.step === "idle" && value === null && (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-700 text-white shadow-md dark:bg-purple-600">
              <Camera className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Take a selfie with your camera
            </p>
            <ul className="mt-2 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <li>Face the camera in good light.</li>
              <li>Take off sunglasses, hats and masks.</li>
            </ul>
          </div>
        )}

        {/* The camera couldn't open, or it stopped. */}
        {problem && ProblemIcon && (
          <div
            role="alert"
            className="flex h-full flex-col items-center justify-center p-6 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <ProblemIcon className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {problem.title}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {problem.message}
            </p>
          </div>
        )}
      </div>

      {/* The buttons for what the box is doing. The main one takes the
          focus when it appears (after the first click), because the button
          that was clicked has just gone. */}
      <div className="mx-auto flex w-full max-w-sm items-center gap-3">
        {view.step === "idle" && value === null && (
          <button
            type="button"
            onClick={openCamera}
            disabled={disabled}
            autoFocus={used}
            className={PRIMARY_BUTTON}
          >
            <Camera className="h-4 w-4" />
            Open camera
          </button>
        )}

        {cameraOn && (
          <>
            {/* The only button while the camera opens, so it takes the
                focus then. Take photo takes it once the camera is on. */}
            <button
              type="button"
              onClick={cancel}
              disabled={disabled || view.step === "saving"}
              autoFocus
              className={SECONDARY_BUTTON}
            >
              Cancel
            </button>
            {view.step !== "starting" && (
              <button
                type="button"
                onClick={takePhoto}
                disabled={disabled || view.step === "saving"}
                autoFocus
                className={PRIMARY_BUTTON}
              >
                <Camera className="h-4 w-4" />
                Take photo
              </button>
            )}
          </>
        )}

        {showSelfie && (
          <button
            type="button"
            onClick={retake}
            disabled={disabled}
            autoFocus={used}
            className={SECONDARY_BUTTON}
          >
            <RotateCcw className="h-4 w-4" />
            Retake
          </button>
        )}

        {problem && (
          <button
            type="button"
            onClick={openCamera}
            disabled={disabled}
            autoFocus
            className={PRIMARY_BUTTON}
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
        )}
      </div>

      {error && (
        <p className="text-center text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Read out by screen readers whenever it changes. */}
      <p aria-live="polite" className="sr-only">
        {statusText(view, value !== null)}
      </p>
    </div>
  );
}
