import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  RotateCcw,
} from "lucide-react";
import type {
  ChecklistStepState,
  NewListingPageView,
} from "@/lib/landlord-status-view";
import { cn } from "@/lib/utils";
import { NEW_LISTING_PATH } from "@/lib/verify-account";

type Icon = React.ComponentType<{ className?: string }>;

/** Each step state's icon and colours. The state is also in words. */
const STEP_STATES: Record<
  ChecklistStepState,
  { icon: Icon; iconClassName: string; labelClassName: string }
> = {
  done: {
    icon: CheckCircle2,
    iconClassName: "text-emerald-600 dark:text-emerald-400",
    labelClassName:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  to_do: {
    icon: Circle,
    iconClassName: "text-zinc-400 dark:text-zinc-500",
    labelClassName:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  being_reviewed: {
    icon: Clock,
    iconClassName: "text-amber-600 dark:text-amber-400",
    labelClassName:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
  rejected: {
    icon: AlertCircle,
    iconClassName: "text-rose-600 dark:text-rose-400",
    labelClassName:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  },
};

// The same button styles as the listing form's.
const PRIMARY_BUTTON =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-800 active:bg-purple-900 dark:bg-purple-600 dark:hover:bg-purple-700";

/**
 * What the new-listing page shows instead of the form while the landlord
 * can't post yet (#205): the two steps, each with what's left to do and
 * a button for it. Or, if their status couldn't be read, a message and
 * Try again. newListingPageView() (src/lib/landlord-status-view.ts)
 * decides which.
 *
 * No "use client": the page draws it on the server.
 */
export default function ListingChecklist({
  view,
}: {
  view: Exclude<NewListingPageView, { show: "form" }>;
}) {
  const isProblem = view.show === "problem";
  const HeaderIcon = isProblem ? AlertCircle : Lock;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/dashboard/landlord"
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900 sm:text-sm dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <section
        aria-labelledby="listing-checklist-title"
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              isProblem
                ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                : "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
            )}
          >
            <HeaderIcon className="h-6 w-6" />
          </div>
          <div>
            <h1
              id="listing-checklist-title"
              className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50"
            >
              {isProblem
                ? "We couldn't check your account"
                : "Finish these steps to post a listing"}
            </h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {isProblem
                ? view.message
                : "Only landlords with a complete profile and a verified account can post new listings. Your existing listings stay up."}
            </p>
          </div>
        </div>

        {view.show === "checklist" ? (
          <ol className="mt-8 space-y-3">
            {view.steps.map((step, index) => {
              const state = STEP_STATES[step.state];
              const StateIcon = state.icon;

              return (
                <li
                  key={step.title}
                  className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-4 sm:flex-row sm:items-center sm:p-5 dark:border-zinc-800"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <StateIcon
                      className={cn(
                        "mt-0.5 h-5 w-5 shrink-0",
                        state.iconClassName,
                      )}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {index + 1}. {step.title}
                        </h2>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-bold",
                            state.labelClassName,
                          )}
                        >
                          {step.stateLabel}
                        </span>
                      </div>
                      {step.reason && (
                        <p className="mt-1 text-xs wrap-break-word text-zinc-700 dark:text-zinc-300">
                          <span className="font-semibold">Reason:</span>{" "}
                          {step.reason}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {step.message}
                      </p>
                    </div>
                  </div>

                  {step.action && (
                    <Link href={step.action.href} className={PRIMARY_BUTTON}>
                      {step.action.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          // A full page load, so the server checks again.
          <a
            href={NEW_LISTING_PATH}
            className={cn(PRIMARY_BUTTON, "mt-6 w-full sm:w-auto")}
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </a>
        )}
      </section>
    </div>
  );
}
