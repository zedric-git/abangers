import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ImageOff,
  ListChecks,
  Mail,
  Phone,
} from "lucide-react";
import VerificationReviewActions from "@/components/VerificationReviewActions";
import VerificationReviewPhotos from "@/components/VerificationReviewPhotos";
import {
  SIGNED_LINK_SECONDS,
  loadSubmissionForReview,
} from "@/lib/auth/review-verification";
import {
  ADMIN_DASHBOARD_PATH,
  PHOTOS_LOAD_ERROR,
  REVIEW_LOAD_ERROR,
  WHAT_TO_CHECK,
  formatMobileNumber,
  formatSubmittedAt,
  idTypeLabel,
  listPathWithNotice,
  signedLinksNote,
  socialLinksOf,
} from "@/lib/admin-review-view";
import { createClient } from "@/lib/supabase/server";

/**
 * One landlord verification, for the admin to review (S2-11.2, #256): the
 * landlord's profile, the ID photos and selfie through short-lived signed
 * links, and Approve / Reject.
 *
 * A submission that isn't there (deleted, a bad id) or isn't pending any
 * more sends the admin back to the list with a note, instead of a 404
 * (#244). The proxy only lets admins in (src/lib/auth/route-guard.ts).
 */
export default async function ReviewVerificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already sends signed-out users home; this is for a session
  // that ends between the two.
  if (!user) {
    redirect("/");
  }

  const data = await loadSubmissionForReview(supabase, id);

  if (data.kind === "missing" || data.kind === "reviewed") {
    redirect(listPathWithNotice("already-reviewed"));
  }

  const backLink = (
    <Link
      href={ADMIN_DASHBOARD_PATH}
      className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900 sm:text-sm dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      <ArrowLeft className="h-4 w-4" />
      All verification requests
    </Link>
  );

  // The read failed: it may well be there, so don't say it isn't.
  if (data.kind === "failed") {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        {backLink}
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{REVIEW_LOAD_ERROR}</p>
        </div>
      </div>
    );
  }

  const { submission, photos } = data;
  const { landlord } = submission;
  const mobileNumber = formatMobileNumber(landlord.contactNumber);
  const socialLinks = socialLinksOf(landlord);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {backLink}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
          Review verification
        </h1>
        <p className="mt-1 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
          {idTypeLabel(submission.idType)} · Sent{" "}
          {formatSubmittedAt(submission.submittedAt)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* The photos */}
        <section
          aria-labelledby="photos-heading"
          className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xs sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2
            id="photos-heading"
            className="text-sm font-bold text-zinc-900 dark:text-zinc-100"
          >
            ID and selfie
          </h2>
          <div className="mt-4">
            {photos ? (
              <VerificationReviewPhotos
                photos={photos}
                idType={submission.idType}
                landlordName={landlord.fullName}
                note={signedLinksNote(SIGNED_LINK_SECONDS)}
              />
            ) : (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
              >
                <ImageOff className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{PHOTOS_LOAD_ERROR}</p>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          {/* The landlord's profile */}
          <section
            aria-labelledby="landlord-heading"
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xs sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2
              id="landlord-heading"
              className="text-xs font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
            >
              Name on the profile
            </h2>
            <p className="mt-1 text-lg font-extrabold break-words text-zinc-950 dark:text-zinc-50">
              {landlord.fullName ?? "No name on their profile"}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Check that it matches the name on the ID.
            </p>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <dt>
                  <Mail className="mt-0.5 h-4 w-4 text-zinc-400" />
                  <span className="sr-only">Email</span>
                </dt>
                <dd className="min-w-0 break-words text-zinc-800 dark:text-zinc-200">
                  {landlord.email ?? "No email on their profile"}
                </dd>
              </div>
              <div className="flex items-start gap-2.5">
                <dt>
                  <Phone className="mt-0.5 h-4 w-4 text-zinc-400" />
                  <span className="sr-only">Mobile number</span>
                </dt>
                <dd className="text-zinc-800 dark:text-zinc-200">
                  {mobileNumber ?? "No mobile number on their profile"}
                </dd>
              </div>
              {socialLinks.map((link) => (
                <div key={link.label} className="flex items-start gap-2.5">
                  <dt className="w-16 shrink-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {link.label}
                  </dt>
                  <dd className="min-w-0 break-all text-zinc-800 dark:text-zinc-200">
                    {link.href ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-700 underline underline-offset-2 hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-200"
                      >
                        {link.text}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      link.text
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* What to check, then the decision */}
          <section
            aria-labelledby="decision-heading"
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xs sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2
              id="decision-heading"
              className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100"
            >
              <ListChecks className="h-4 w-4 text-purple-700 dark:text-purple-400" />
              Before you decide
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-zinc-600 dark:text-zinc-400">
              {WHAT_TO_CHECK.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>

            <div className="mt-5">
              <VerificationReviewActions
                submissionId={submission.id}
                landlordName={landlord.fullName}
                canApprove={photos !== null}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
