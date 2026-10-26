"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  Lock,
  Pencil,
  Send,
  ShieldCheck,
} from "lucide-react";
import IdPhotoPicker from "@/components/IdPhotoPicker";
import PhotoPreview from "@/components/PhotoPreview";
import SelfieCamera from "@/components/SelfieCamera";
import VerificationStatusCard, {
  VERIFICATION_STATUS_HEADING_ID,
} from "@/components/VerificationStatusCard";
import { submitVerification } from "@/lib/auth/submit-verification";
import { createClient } from "@/lib/supabase/client";
import {
  ID_TYPES,
  ID_TYPE_LABELS,
  idTypeSchema,
  needsBackPhoto,
  verificationSubmissionSchema,
  type VerificationSubmissionInput,
} from "@/lib/validations/verification";
import {
  afterSubmitView,
  idPhotoLabels,
  PROFILE_PATH,
  VERIFY_ACCOUNT_INTRO,
  type AfterSubmitView,
  type VerificationStatusView,
} from "@/lib/verify-account";

interface VerifyAccountFormProps {
  /** The signed-in landlord's id: their photos go in this folder. */
  landlordId: string;
  /**
   * Their name on the Profile page, for the hint under the ID type. null
   * if it's empty or couldn't be read.
   */
  profileName: string | null;
  /**
   * Why the admin rejected their last verification, shown above the form
   * so they can fix it (#205). null if it wasn't rejected (or couldn't be
   * read).
   */
  rejectionReason: string | null;
  /**
   * When true, renders in compact/embedded mode inside a unified card for
   * the Profile page.
   */
  compact?: boolean;
}

type Step = "form" | "review";

/** The heading of each step: the focus moves there when the step changes. */
const STEP_HEADING_IDS: Record<Step, string> = {
  form: "verify-account-id-heading",
  review: "verify-account-review-heading",
};

// The consent the landlord gives (#203's plan, approved by the PM).
const CONSENT_TEXT =
  "I agree that Abangers may use the photos of my ID and my selfie to verify my identity.";
const PRIVACY_NOTE =
  "They're stored privately. Only you and the Abangers admins who review your verification can see them.";

/** For anything submitVerification doesn't expect (it never throws on purpose). */
const UNEXPECTED_ERROR =
  "Something went wrong while sending your verification. Please try again.";

// The same styles as LandlordListingForm's cards, fields and buttons.
const CARD =
  "rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900";
const CARD_TITLE =
  "text-base font-semibold text-zinc-900 outline-none dark:text-zinc-100";
const CARD_TEXT = "mt-1 text-xs text-zinc-500 dark:text-zinc-400";
const FIELD_ERROR = "mt-1 text-xs text-rose-500";
const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";
const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-6 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-purple-800 active:bg-purple-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700";

/**
 * The Verify account form (S1-15.5, #203): the landlord chooses their ID
 * type, adds photos of the ID, takes a selfie and ticks the consent box
 * (step 1), then checks everything and sends it (step 2).
 *
 * - Validation: verificationSubmissionSchema (#204), through zodResolver.
 * - Photos: IdPhotoPicker for the ID, SelfieCamera (#202) for the selfie.
 *   Both hand over compressed Files, and nothing is uploaded until Submit:
 *   uploaded files can't be deleted (0009).
 * - Submit: submitVerification() (#204), in the browser, so the photos go
 *   straight to Supabase Storage (a server action is capped at 1 MB).
 *   Then the "being reviewed" card, and router.refresh() renders the page
 *   on the server again.
 */
export default function VerifyAccountForm({
  landlordId,
  profileName,
  rejectionReason,
  compact = false,
}: VerifyAccountFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  // Stops a double click from sending two submissions: the button is only
  // disabled once React has re-rendered.
  const sendingRef = useRef(false);
  // Why the last Submit didn't work, shown next to the buttons.
  const [submitError, setSubmitError] = useState<string | null>(null);
  // The card shown once Submit has worked (or it turned out to be sent
  // already).
  const [sentStatus, setSentStatus] = useState<VerificationStatusView | null>(
    null,
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(verificationSubmissionSchema),
    // Everything else starts empty.
    defaultValues: { consent: false },
  });

  const idType = useWatch({ control, name: "id_type" });
  const idFront = useWatch({ control, name: "id_front" });
  const idBack = useWatch({ control, name: "id_back" });
  const selfie = useWatch({ control, name: "selfie" });
  const labels = idPhotoLabels(idType);
  // null for a passport, which only needs its photo page.
  const backLabel = labels.back;

  const idTypeField = register("id_type", {
    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
      const chosen = idTypeSchema.safeParse(event.target.value);
      // A passport only needs its photo page: drop a back photo chosen
      // before. The schema refuses one, and its picker is about to go.
      if (chosen.success && !needsBackPhoto(chosen.data)) {
        setValue("id_back", undefined);
      }
      // Once Review has been clicked, keep the back photo's message in
      // step with the ID type (needed now, or not any more).
      if (isSubmitted) {
        void trigger("id_back");
      }
    },
  });

  /** Switches steps, starting the new one at the top of the page. */
  function showStep(next: Step) {
    // Puts the new step on the page right away, so the scroll and the
    // focus below happen on it (see LandlordListingForm's showStep).
    flushSync(() => setStep(next));
    if (compact) {
      const main = document.querySelector("main");
      const target = document.getElementById("verify-account");
      if (main && target) {
        const mainRect = main.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        main.scrollTo({
          top: main.scrollTop + (targetRect.top - mainRect.top) - 20,
          behavior: "smooth",
        });
      } else if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // The landlord dashboard scrolls inside its <main>, not the window.
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "instant" });
    }
    // For keyboards and screen readers: the step's heading, not the
    // button that was clicked (it's gone).
    document
      .getElementById(STEP_HEADING_IDS[next])
      ?.focus({ preventScroll: true });
  }

  async function send(values: VerificationSubmissionInput) {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    let next: AfterSubmitView;
    try {
      next = afterSubmitView(
        await submitVerification(createClient(), landlordId, values),
      );
    } catch (sendError) {
      // submitVerification answers with a reason for everything it
      // expects. This is anything else, e.g. a page that isn't https or
      // localhost has no crypto.randomUUID().
      console.error("Couldn't send the verification:", sendError);
      next = { show: "error", message: UNEXPECTED_ERROR };
    }

    if (next.show === "status") {
      flushSync(() => setSentStatus(next.status));
      if (compact) {
        const main = document.querySelector("main");
        const target = document.getElementById("verify-account");
        if (main && target) {
          const mainRect = main.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          main.scrollTo({
            top: main.scrollTop + (targetRect.top - mainRect.top) - 20,
            behavior: "smooth",
          });
        } else if (target) {
          target.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        document
          .querySelector("main")
          ?.scrollTo({ top: 0, behavior: "instant" });
      }
      document
        .getElementById(VERIFICATION_STATUS_HEADING_ID)
        ?.focus({ preventScroll: true });
      // Renders the page on the server again: it now shows this card
      // itself, and anything else on the page that shows the status.
      router.refresh();
      return;
    }

    sendingRef.current = false;
    setSubmitting(false);
    setSubmitError(next.message);
  }

  if (sentStatus) {
    return <VerificationStatusCard status={sentStatus} />;
  }

  const stepsNav = (
    <nav aria-label="Steps">
      <div className="inline-flex items-center gap-2 rounded-xl bg-zinc-200/80 p-1 dark:bg-zinc-800">
        <button
          type="button"
          onClick={() => showStep("form")}
          disabled={submitting}
          aria-current={step === "form" ? "step" : undefined}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed ${
            step === "form"
              ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-900 dark:text-zinc-100"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          1. ID & selfie
        </button>
        <button
          type="button"
          onClick={handleSubmit(() => showStep("review"))}
          disabled={submitting}
          aria-current={step === "review" ? "step" : undefined}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed ${
            step === "review"
              ? "bg-purple-700 text-white shadow-2xs dark:bg-purple-600"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          2. Review & submit
        </button>
      </div>
    </nav>
  );

  const compactHeader = (
    <div className="flex flex-col gap-4 border-b border-zinc-100 pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
            Verify your account
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {VERIFY_ACCOUNT_INTRO}
          </p>
        </div>
      </div>
      {stepsNav}
    </div>
  );

  const reviewContent = (
    <div className="space-y-6">
      <section
        aria-labelledby={STEP_HEADING_IDS.review}
        className={compact ? "space-y-4" : CARD}
      >
        <h2 id={STEP_HEADING_IDS.review} tabIndex={-1} className={CARD_TITLE}>
          Review and submit
        </h2>
        <p className={CARD_TEXT}>
          Check that every photo is clear and that the text on your ID is
          readable. Once it&apos;s sent, you can&apos;t change or withdraw it.
        </p>

        <dl className="mt-6 space-y-6">
          <div>
            <dt className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Type of ID
            </dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {idType ? ID_TYPE_LABELS[idType] : null}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Photos of your ID
            </dt>
            <dd className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {idFront && (
                <ReviewPhoto photo={idFront} label={labels.front} shape="id" />
              )}
              {backLabel && idBack && (
                <ReviewPhoto photo={idBack} label={backLabel} shape="id" />
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Selfie
            </dt>
            <dd className="mt-2 max-w-60">
              {selfie && (
                <ReviewPhoto
                  photo={selfie}
                  label="Your selfie"
                  shape="selfie"
                />
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Consent
            </dt>
            <dd className="mt-1 flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
              {CONSENT_TEXT}
            </dd>
          </div>
        </dl>
      </section>

      {submitError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {submitError}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={() => showStep("form")}
          disabled={submitting}
          className={SECONDARY_BUTTON}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
        <button
          type="button"
          // Checks the form again, then sends it. If it somehow isn't
          // valid any more, back to step 1, where the messages are.
          // handleSubmit is called on the click, not while rendering:
          // the react-hooks/refs lint rule doesn't allow passing send
          // (it reads sendingRef) to a function during render.
          onClick={(event) => handleSubmit(send, () => showStep("form"))(event)}
          disabled={submitting}
          className={PRIMARY_BUTTON}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending your photos…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit for review
            </>
          )}
        </button>
      </div>
      {submitting && (
        <p
          aria-live="polite"
          className="text-xs text-zinc-500 sm:text-right dark:text-zinc-400"
        >
          Sending your photos. This can take a minute on mobile data: keep this
          page open.
        </p>
      )}
    </div>
  );

  const sectionClass = compact ? "space-y-4" : CARD;

  const formContent = (
    <form
      onSubmit={handleSubmit(() => showStep("review"))}
      noValidate
      className="space-y-6"
    >
      {/* After a rejection: the admin's reason, so they can fix it (#205) */}
      {rejectionReason && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:p-5 dark:border-rose-900/50 dark:bg-rose-950/40">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="min-w-0 text-xs text-rose-800 dark:text-rose-300">
            <p className="text-sm font-bold text-rose-950 dark:text-rose-100">
              Your last verification was rejected
            </p>
            <p className="mt-1 wrap-break-word">
              <span className="font-semibold">Reason:</span> {rejectionReason}
            </p>
            <p className="mt-1">Fix this before you send a new one.</p>
          </div>
        </div>
      )}

      {/* 1. The type of ID */}
      <section aria-labelledby={STEP_HEADING_IDS.form} className={sectionClass}>
        <h2 id={STEP_HEADING_IDS.form} tabIndex={-1} className={CARD_TITLE}>
          1. Your ID
        </h2>
        <p className={CARD_TEXT}>
          Use a valid government ID with your photo and full name. It must not
          be expired.
        </p>

        <div className="mt-6 max-w-md">
          <label
            htmlFor="id-type"
            className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
          >
            Type of ID *
          </label>
          <select
            id="id-type"
            {...idTypeField}
            aria-invalid={errors.id_type ? true : undefined}
            aria-describedby={
              errors.id_type ? "id-type-error id-type-hint" : "id-type-hint"
            }
            className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
          >
            <option value="">Choose your ID</option>
            {ID_TYPES.map((type) => (
              <option key={type} value={type}>
                {ID_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          {errors.id_type && (
            <p id="id-type-error" className={FIELD_ERROR}>
              {errors.id_type.message}
            </p>
          )}
        </div>

        {/* The admin checks the ID's name against the profile's, and
            the name is locked once verified (0008's trigger). */}
        <p
          id="id-type-hint"
          className="mt-4 rounded-xl border border-purple-100 bg-purple-50 p-3 text-xs text-purple-900 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-purple-200"
        >
          The name on your ID must match your profile name
          {profileName ? (
            <>
              , <strong className="font-semibold">{profileName}</strong>
            </>
          ) : null}
          . If it doesn&apos;t, change it on your{" "}
          {compact ? (
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("full-name");
                el?.focus();
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="cursor-pointer font-semibold underline underline-offset-2"
            >
              profile above
            </button>
          ) : (
            <Link
              href={PROFILE_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2"
            >
              Profile page
              <span className="sr-only"> (opens in a new tab)</span>
            </Link>
          )}{" "}
          first: it can&apos;t be changed once you&apos;re verified.
        </p>
      </section>

      {compact && <hr className="border-zinc-100 dark:border-zinc-800" />}

      {/* 2. Photos of the ID */}
      <section
        aria-labelledby="verify-account-photos-heading"
        className={sectionClass}
      >
        <h2 id="verify-account-photos-heading" className={CARD_TITLE}>
          2. Photos of your ID
        </h2>
        <ul className={`${CARD_TEXT} list-inside list-disc space-y-0.5`}>
          <li>Fit the whole ID in the photo, on a plain surface.</li>
          <li>Use good light, with no glare on the ID.</li>
          <li>Make sure all the text is sharp and readable.</li>
        </ul>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Controller
            control={control}
            name="id_front"
            render={({ field, fieldState }) => (
              <IdPhotoPicker
                id="id-front"
                label={labels.front}
                fileName="id-front.jpg"
                value={field.value ?? null}
                onChange={field.onChange}
                error={fieldState.error?.message}
                buttonRef={field.ref}
              />
            )}
          />
          {/* Not for a passport: it only needs its photo page. */}
          {backLabel && (
            <Controller
              control={control}
              name="id_back"
              render={({ field, fieldState }) => (
                <IdPhotoPicker
                  id="id-back"
                  label={backLabel}
                  fileName="id-back.jpg"
                  value={field.value ?? null}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  buttonRef={field.ref}
                />
              )}
            />
          )}
        </div>
      </section>

      {compact && <hr className="border-zinc-100 dark:border-zinc-800" />}

      {/* 3. The selfie */}
      <section
        aria-labelledby="verify-account-selfie-heading"
        className={sectionClass}
      >
        <h2 id="verify-account-selfie-heading" className={CARD_TITLE}>
          3. Selfie
        </h2>
        <p className={CARD_TEXT}>
          Take a photo of your face with your camera, so the admin can match it
          to your ID.
        </p>

        <div className="mt-6">
          <Controller
            control={control}
            name="selfie"
            render={({ field, fieldState }) => (
              <SelfieCamera
                value={field.value ?? null}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </div>
      </section>

      {compact && <hr className="border-zinc-100 dark:border-zinc-800" />}

      {/* 4. Consent */}
      <section
        aria-labelledby="verify-account-consent-heading"
        className={sectionClass}
      >
        <h2 id="verify-account-consent-heading" className={CARD_TITLE}>
          4. Consent
        </h2>

        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            {...register("consent")}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={
              errors.consent ? "consent-error consent-note" : "consent-note"
            }
            className="mt-0.5 h-4 w-4 shrink-0 accent-purple-700 dark:accent-purple-500"
          />
          <span className="text-sm text-zinc-800 dark:text-zinc-200">
            {CONSENT_TEXT}
          </span>
        </label>
        <p
          id="consent-note"
          className="mt-3 flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400"
        >
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {PRIVACY_NOTE}
        </p>
        {errors.consent && (
          <p id="consent-error" className={FIELD_ERROR}>
            {errors.consent.message}
          </p>
        )}
      </section>

      <div className="flex justify-end pt-2">
        <button type="submit" className={PRIMARY_BUTTON}>
          <Eye className="h-4 w-4" />
          Review & submit
        </button>
      </div>
    </form>
  );

  if (compact) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        {compactHeader}
        <div className="pt-6">
          {step === "review" ? reviewContent : formContent}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stepsNav}
      {step === "review" ? reviewContent : formContent}
    </div>
  );
}

/** One photo on the review step, as big as the column, with its name. */
function ReviewPhoto({
  photo,
  label,
  shape,
}: {
  photo: File;
  label: string;
  /** "id": wider than tall, like an ID card. "selfie": the selfie's 3:4. */
  shape: "id" | "selfie";
}) {
  return (
    <figure>
      <div
        className={`relative w-full overflow-hidden rounded-2xl bg-zinc-900 ${
          shape === "id" ? "aspect-3/2" : "aspect-3/4"
        }`}
      >
        <PhotoPreview
          photo={photo}
          alt={label}
          sizes={shape === "id" ? "(max-width: 640px) 100vw, 420px" : "240px"}
        />
      </div>
      <figcaption className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        {label}
      </figcaption>
    </figure>
  );
}
