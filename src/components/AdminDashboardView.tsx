import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import PendingVerificationList from "@/components/PendingVerificationList";
import type { PendingVerification } from "@/lib/auth/review-verification";
import {
  ADMIN_VERIFICATIONS_PATH,
  PENDING_LIST_LOAD_ERROR,
} from "@/lib/admin-review-view";
import {
  HOME_PENDING_LIMIT,
  overviewStats,
  type AdminOverview,
  type OverviewStat,
} from "@/lib/admin-overview";

// Each stat card's icon and colours.
const STAT_LOOKS: Record<
  OverviewStat["key"],
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  users: {
    icon: Users,
    color:
      "text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-300",
  },
  listings: {
    icon: Building2,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300",
  },
  pending: {
    icon: ShieldAlert,
    color:
      "text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300",
  },
  verified: {
    icon: ShieldCheck,
    color:
      "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
};

interface AdminDashboardViewProps {
  overview: AdminOverview;
  /** Oldest first, or null if they couldn't be read. */
  pending: PendingVerification[] | null;
}

/**
 * The admin dashboard's home (#294), with real data (#309): the numbers
 * from src/lib/admin-overview.ts and the oldest verifications waiting for
 * review. The sample stats, verifications, "System Health" and "System
 * Activity" it used to show had no data behind them.
 */
export default function AdminDashboardView({
  overview,
  pending,
}: AdminDashboardViewProps) {
  const stats = overviewStats(overview);
  const shownPending = pending?.slice(0, HOME_PENDING_LIMIT) ?? [];
  const morePending = (pending?.length ?? 0) - shownPending.length;

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className="text-zinc-400 dark:text-zinc-500">Admin</span>
            <span className="text-zinc-400 dark:text-zinc-500">/</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              Overview
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Admin Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={ADMIN_VERIFICATIONS_PATH}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-purple-600 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-purple-700"
          >
            Review Verifications
            {pending && pending.length > 0 ? ` (${pending.length})` : ""}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const { icon: Icon, color } = STAT_LOOKS[stat.key];
          return (
            <div
              key={stat.key}
              className={`rounded-2xl border p-5 shadow-xs transition-all ${
                stat.highlight
                  ? "border-amber-400/50 bg-amber-50/30 dark:border-amber-500/30 dark:bg-amber-950/15"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {stat.label}
                </span>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {stat.value}
                </span>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {stat.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* The oldest verifications waiting for review */}
      <section
        aria-labelledby="pending-heading"
        className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <h2
              id="pending-heading"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
            >
              Action Required: Landlord Verifications
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Landlords send a government ID and a live selfie. The oldest come
              first.
            </p>
          </div>
          <Link
            href={ADMIN_VERIFICATIONS_PATH}
            className="shrink-0 text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400"
          >
            View all
          </Link>
        </div>

        <div className="mt-4">
          {pending === null ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{PENDING_LIST_LOAD_ERROR}</p>
            </div>
          ) : (
            <>
              <PendingVerificationList items={shownPending} />
              {morePending > 0 && (
                <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  <Link
                    href={ADMIN_VERIFICATIONS_PATH}
                    className="font-semibold text-purple-600 hover:underline dark:text-purple-400"
                  >
                    {morePending} more waiting
                  </Link>
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
