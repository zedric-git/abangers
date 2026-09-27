import Link from "next/link";
import { Plus, Building2, Eye, MessageSquare } from "lucide-react";

export default function LandlordDashboardPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">
            Landlord Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your rental listings, monitor inquiries, and update property
            details.
          </p>
        </div>

        <Link
          href="/dashboard/landlord/listings/new"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-purple-700 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          Add New Listing
        </Link>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Active Listings
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              0
            </span>
            <span className="ml-2 text-xs text-zinc-400">
              properties listed
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Total Inquiries
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              0
            </span>
            <span className="ml-2 text-xs text-zinc-400">renter messages</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Total Views
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Eye className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              0
            </span>
            <span className="ml-2 text-xs text-zinc-400">views this month</span>
          </div>
        </div>
      </div>

      {/* Listings Placeholder Container */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
          <Building2 className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
          No listings created yet
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
          Get started by posting your first boarding house or rental property to
          reach renters.
        </p>
        <div className="mt-5">
          <Link
            href="/dashboard/landlord/listings/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-purple-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Create First Listing
          </Link>
        </div>
      </div>
    </div>
  );
}
