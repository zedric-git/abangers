"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CircleCheck, CircleX, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { reviewVerificationAction } from "@/app/dashboard/admin/verifications/actions";
import {
  ADMIN_DASHBOARD_PATH,
  REJECT_DIALOG,
  approveDialogText,
  listPathWithNotice,
  noticeAfterReview,
} from "@/lib/admin-review-view";
import {
  REJECTION_REASON_MAX_LENGTH,
  rejectionSchema,
  type VerificationReviewInput,
} from "@/lib/validations/verification";

interface VerificationReviewActionsProps {
  submissionId: string;
  /** For the Approve dialog's question; null when the profile has none. */
  landlordName: string | null;
  /** False when the photos couldn't be loaded: never approve unseen. */
  canApprove: boolean;
}

// The same card and button styles as ListingSaveErrorModal and
// DeleteListingModal.
const DIALOG_CARD =
  "gap-0 rounded-3xl border-zinc-200 bg-white p-6 shadow-2xl sm:p-7 dark:border-zinc-800 dark:bg-zinc-900";
const SECONDARY_BUTTON =
  "inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white py-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";
const APPROVE_BUTTON =
  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700";
const REJECT_BUTTON =
  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 dark:bg-rose-600 dark:hover:bg-rose-700";
// On the page, Reject is outlined so Approve reads as the main step.
const REJECT_OUTLINE_BUTTON =
  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white py-3 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-900/60 dark:bg-zinc-900 dark:text-rose-300 dark:hover:bg-rose-950/40";

/** What went wrong saving, shown in the open dialog. */
interface SaveProblem {
  message: string;
  /** Another admin got there first, or it's gone: link back to the list. */
  alreadyReviewed: boolean;
}

function SaveProblemNote({ problem }: { problem: SaveProblem }) {
  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        <p>{problem.message}</p>
        {problem.alreadyReviewed && (
          <Link
            href={ADMIN_DASHBOARD_PATH}
            className="font-semibold underline underline-offset-2"
          >
            Back to the list
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * The review page's Approve and Reject buttons, and the dialog each one
 * opens (S2-11.2, #256). Approve asks to confirm (it unlocks posting and
 * locks the landlord's name, and can't be undone from the app); Reject asks
 * for the reason the landlord will see. Both save through
 * reviewVerificationAction, then go back to the list with a note.
 *
 * Built on shadcn's AlertDialog and Dialog: focus moves into the dialog,
 * Escape closes it (except while saving), and the page behind can't be
 * used while it's open.
 */
export default function VerificationReviewActions({
  submissionId,
  landlordName,
  canApprove,
}: VerificationReviewActionsProps) {
  const router = useRouter();
  const [openDialog, setOpenDialog] = useState<"approve" | "reject" | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<SaveProblem | null>(null);
  const approveCancelRef = useRef<HTMLButtonElement>(null);

  // The Reject dialog's form: rejectionSchema is the reject half of
  // verificationReviewSchema, which the server checks again.
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(rejectionSchema),
    defaultValues: { submissionId, decision: "reject" as const, reason: "" },
  });
  const reason = useWatch({ control, name: "reason" }) ?? "";
  const reasonLength = reason.trim().length;

  const approveText = approveDialogText(landlordName);

  function open(dialog: "approve" | "reject") {
    setProblem(null);
    setOpenDialog(dialog);
  }

  function close() {
    // Not while saving: the answer would come back to a closed dialog.
    if (!saving) {
      setOpenDialog(null);
      setProblem(null);
    }
  }

  async function send(review: VerificationReviewInput) {
    setSaving(true);
    setProblem(null);
    try {
      const result = await reviewVerificationAction(review);
      if (result.ok) {
        // replace, not push: Back shouldn't come back to a decided review.
        // The buttons stay disabled while the list loads.
        router.replace(listPathWithNotice(noticeAfterReview(result.decision)));
        return;
      }
      setProblem({
        message: result.message,
        alreadyReviewed: result.reason === "already_reviewed",
      });
    } catch (err) {
      console.error("Review error:", err);
      setProblem({
        message:
          "We couldn't save your decision. Check your connection and try again.",
        alreadyReviewed: false,
      });
    }
    setSaving(false);
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => open("approve")}
            disabled={!canApprove}
            aria-describedby={canApprove ? undefined : "approve-needs-photos"}
            className={APPROVE_BUTTON}
          >
            <CircleCheck className="h-4 w-4" />
            Approve
          </button>
          <button
            type="button"
            onClick={() => open("reject")}
            className={REJECT_OUTLINE_BUTTON}
          >
            <CircleX className="h-4 w-4" />
            Reject
          </button>
        </div>
        {!canApprove && (
          <p
            id="approve-needs-photos"
            className="text-xs text-zinc-500 dark:text-zinc-400"
          >
            You can approve once the photos load.
          </p>
        )}
      </div>

      {/* Approve: confirm first */}
      <AlertDialog
        open={openDialog === "approve"}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <AlertDialogContent
          // Start on Cancel, the safe choice. (shadcn's AlertDialogCancel
          // uses theme colours this app doesn't define, so it's a plain
          // button, like ListingSaveErrorModal's.)
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            approveCancelRef.current?.focus();
          }}
          className={DIALOG_CARD}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CircleCheck className="h-7 w-7" />
          </div>
          <div className="mt-5 text-center">
            <AlertDialogTitle className="text-lg font-extrabold text-zinc-900 sm:text-xl dark:text-zinc-50">
              {approveText.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
              {approveText.description}
            </AlertDialogDescription>
          </div>

          {problem && <SaveProblemNote problem={problem} />}

          <div className="mt-7 flex items-center gap-3">
            <button
              ref={approveCancelRef}
              type="button"
              onClick={close}
              disabled={saving}
              className={SECONDARY_BUTTON}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => send({ submissionId, decision: "approve" })}
              disabled={saving}
              className={APPROVE_BUTTON}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CircleCheck className="h-4 w-4" />
                  Approve
                </>
              )}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject: with the reason the landlord sees */}
      <Dialog
        open={openDialog === "reject"}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <DialogContent showCloseButton={false} className={DIALOG_CARD}>
          <form onSubmit={handleSubmit((values) => send(values))} noValidate>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <CircleX className="h-7 w-7" />
            </div>
            <div className="mt-5 text-center">
              <DialogTitle className="text-lg font-extrabold text-zinc-900 sm:text-xl dark:text-zinc-50">
                {REJECT_DIALOG.title}
              </DialogTitle>
              <DialogDescription className="mt-2 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
                {REJECT_DIALOG.hint}
              </DialogDescription>
            </div>

            <div className="mt-5">
              <label
                htmlFor="rejection-reason"
                className="text-xs font-bold text-zinc-800 dark:text-zinc-200"
              >
                {REJECT_DIALOG.label}
              </label>
              <textarea
                id="rejection-reason"
                rows={4}
                {...register("reason")}
                placeholder={REJECT_DIALOG.placeholder}
                aria-invalid={errors.reason ? true : undefined}
                aria-describedby={
                  errors.reason
                    ? "rejection-reason-error rejection-reason-count"
                    : "rejection-reason-count"
                }
                className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden aria-invalid:border-rose-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
              />
              <div className="mt-1 flex items-start justify-between gap-3 text-[11px]">
                <p
                  id="rejection-reason-error"
                  className="text-rose-600 dark:text-rose-400"
                >
                  {errors.reason?.message}
                </p>
                <p
                  id="rejection-reason-count"
                  className={
                    reasonLength > REJECTION_REASON_MAX_LENGTH
                      ? "shrink-0 font-semibold text-rose-600 dark:text-rose-400"
                      : "shrink-0 text-zinc-500 dark:text-zinc-400"
                  }
                >
                  {reasonLength}/{REJECTION_REASON_MAX_LENGTH}
                </p>
              </div>
            </div>

            {problem && <SaveProblemNote problem={problem} />}

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className={SECONDARY_BUTTON}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className={REJECT_BUTTON}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <CircleX className="h-4 w-4" />
                    Reject
                  </>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
