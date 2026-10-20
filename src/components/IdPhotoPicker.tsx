"use client";

import { useEffect, useRef, useState } from "react";
import { IdCard, ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import PhotoPreview from "@/components/PhotoPreview";
import { prepareIdPhoto } from "@/lib/id-photo";
import { cn } from "@/lib/utils";

interface IdPhotoPickerProps {
  /** Unique on the page, e.g. "id-front": the ids of its parts start with it. */
  id: string;
  /** What the photo is, e.g. "Front of your ID". */
  label: string;
  /** The name of the File handed over, e.g. "id-front.jpg". */
  fileName: string;
  /** The photo chosen so far (already compressed), or null. The form keeps it. */
  value: File | null;
  /** Gets the compressed photo when one is chosen, and null on Remove. */
  onChange: (photo: File | null) => void;
  /** The form's message about this photo, e.g. "Add a photo of the front of your ID". */
  error?: string;
  /** True while the form can't be changed. */
  disabled?: boolean;
  /**
   * React Hook Form's field.ref: gets the main button, so the form can
   * focus it when this photo is missing.
   */
  buttonRef?: (button: HTMLButtonElement | null) => void;
}

// The same button styles as SelfieCamera's.
const SECONDARY_BUTTON =
  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white py-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";
const PRIMARY_BUTTON =
  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-700 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-purple-800 active:bg-purple-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700";

/**
 * Picks one photo of the landlord's ID for the Verify account page
 * (S1-15.5, #203): the front, the back, or a passport's photo page.
 *
 * - A plain file picker for images, so on a phone it also offers the
 *   camera. Any photo of the ID is fine, unlike the selfie (SelfieCamera
 *   has no file picker on purpose).
 * - The photo is prepared as soon as it's picked (prepareIdPhoto,
 *   src/lib/id-photo.ts): opened the right way up and compressed to a
 *   JPEG of at most 1 MB. The preview shows exactly that.
 * - Nothing is uploaded here: submitVerification uploads the photos when
 *   the form is submitted, because uploaded files can't be deleted.
 * - If the photo can't be used (a PDF, a HEIC photo this browser can't
 *   open, ...), it says why, and keeps the photo chosen before, if any.
 */
export default function IdPhotoPicker({
  id,
  label,
  fileName,
  value,
  onChange,
  error,
  disabled = false,
  buttonRef,
}: IdPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mainButtonRef = useRef<HTMLButtonElement | null>(null);
  // Counts the photos picked, so only the newest one is used if another
  // is picked while one is being prepared. Also counts up when the picker
  // goes away (e.g. Passport is chosen while the back photo is being
  // prepared), so that photo is dropped instead of handed over.
  const picksRef = useRef({ latest: 0 });
  const [preparing, setPreparing] = useState(false);
  // Why the last photo picked can't be used.
  const [problem, setProblem] = useState<string | null>(null);
  // What screen readers hear when the photo changes.
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const picks = picksRef.current;
    return () => {
      picks.latest += 1;
    };
  }, []);

  /** The main button goes to React Hook Form too. */
  function setMainButton(button: HTMLButtonElement | null) {
    mainButtonRef.current = button;
    buttonRef?.(button);
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Empty the picker, so choosing the same file again still counts.
    event.target.value = "";
    if (!file) return;

    const picks = picksRef.current;
    picks.latest += 1;
    const pick = picks.latest;
    setPreparing(true);
    setProblem(null);
    setAnnouncement("Preparing your photo…");

    const result = await prepareIdPhoto(file, fileName);
    // Another photo was picked, or the picker went away, in the meantime.
    if (pick !== picks.latest) return;

    setPreparing(false);
    if (result.ok) {
      setAnnouncement(`${label}: photo added.`);
      onChange(result.photo);
    } else {
      // The problem itself is read out: it's an alert.
      setAnnouncement("");
      setProblem(result.message);
    }
  }

  function remove() {
    // Also drops a photo that's still being prepared.
    picksRef.current.latest += 1;
    setPreparing(false);
    setProblem(null);
    setAnnouncement(`${label}: photo removed.`);
    onChange(null);
    // Remove is about to go: keep the focus on the picker.
    mainButtonRef.current?.focus();
  }

  const busy = disabled || preparing;
  const message = problem ?? error;
  const messageId = `${id}-message`;
  // For screen readers, which photo the buttons are for: "front of your
  // ID". Only the first letter is lowercased, so "ID" stays "ID".
  const which = label.charAt(0).toLowerCase() + label.slice(1);

  return (
    <div className="space-y-3">
      <p
        id={`${id}-label`}
        className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </p>

      {/* The photo, or a box to click when there's none. ID cards are
          wider than tall; the whole photo shows, whatever its shape. */}
      <div
        className={cn(
          "relative aspect-3/2 w-full overflow-hidden rounded-2xl border-2",
          value
            ? "border-transparent bg-zinc-900"
            : message
              ? "border-dashed border-red-300 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20"
              : "border-dashed border-zinc-300 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-800/40",
        )}
      >
        {value ? (
          <PhotoPreview
            photo={value}
            alt={label}
            sizes="(max-width: 640px) 100vw, 400px"
          />
        ) : (
          // Clicking anywhere in the empty box opens the picker too. The
          // button below is the way in for the keyboard and screen readers.
          <label
            htmlFor={`${id}-input`}
            className={cn(
              "flex h-full flex-col items-center justify-center p-4 text-center",
              busy ? "cursor-not-allowed" : "cursor-pointer",
            )}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <IdCard className="h-6 w-6" />
            </span>
            <span className="mt-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              No photo yet
            </span>
            <span className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Choose a photo, or take one with your phone.
            </span>
          </label>
        )}

        {preparing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900/70 p-4 text-center text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-xs font-semibold">Preparing your photo…</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          ref={setMainButton}
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-describedby={message ? messageId : undefined}
          className={value ? SECONDARY_BUTTON : PRIMARY_BUTTON}
        >
          {value ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {value ? "Replace photo" : "Choose photo"}
          <span className="sr-only"> of the {which}</span>
        </button>
        {value && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className={SECONDARY_BUTTON}
          >
            <Trash2 className="h-4 w-4" />
            Remove
            <span className="sr-only"> the photo of the {which}</span>
          </button>
        )}
      </div>

      {/* The picker itself, hidden: the button and the box open it. Not
          `capture`: a photo from the gallery is fine for an ID. */}
      <input
        ref={inputRef}
        id={`${id}-input`}
        type="file"
        accept="image/*"
        disabled={busy}
        onChange={handleFile}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />

      {message && (
        <p
          id={messageId}
          role={problem ? "alert" : undefined}
          className="text-xs font-medium text-red-600 dark:text-red-400"
        >
          {message}
        </p>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
