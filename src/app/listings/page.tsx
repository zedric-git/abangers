import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, AlertTriangle, Home, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { dashboardFor, parseRole } from "@/lib/auth/post-login";
import PublicListingsView from "@/components/PublicListingsView";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import {
  MISSING_LISTING_NOTICE,
  MISSING_PUBLIC_LISTING_NOTE,
} from "@/lib/listing-lookup";
import type { ListingPreview } from "@/types/listing";
import { parseListingFilterParams } from "@/lib/validations/listing-filters";

export const dynamic = "force-dynamic";

export const PUBLIC_LISTING_COLUMNS =
  "id, title, monthly_rent, available_rooms, total_rooms, property_type, occupancy_type, allowed_gender, address, city, description, cover_image, images, availability_status, amenities, utilities, room_features, bathroom_features, kitchen_features, laundry_features, safety_features, house_rules, latitude, longitude, created_at";

interface PublicListingsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PublicListingsPage({
  searchParams,
}: PublicListingsPageProps) {
  const resolvedParams = await searchParams;
  const initialFilters = parseListingFilterParams(resolvedParams);
  // A missing listing's page sends the visitor here with ?notice= (#93).
  const showMissingListingNote =
    resolvedParams.notice === MISSING_LISTING_NOTICE;

  const supabase = await createClient();

  // Check if user is logged in to show a quick dashboard shortcut in the header
  // and to hide the favorite hearts from landlords and admins.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dashboardPath: string | null = null;
  let userRole: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = parseRole(profile?.role);
    // Renters browse in their dashboard's Find a Place, not here.
    if (role === "renter") {
      redirect("/dashboard/renter");
    }
    userRole = role;
    if (role) {
      dashboardPath = dashboardFor(role);
    }
  }

  // Fetch all available listings (newest first), excluding private landlord columns
  const { data: rows, error } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_COLUMNS)
    .eq("availability_status", "available")
    .order("created_at", { ascending: false });

  const listings: ListingPreview[] = rows ?? [];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-50/70 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Top Navigation Bar: Abangers logo on the left; Home and Log In /
          Sign Up (guests) or My Dashboard / Log Out (signed in) on the right (#86) */}
      <header className="sticky top-0 z-30 shrink-0 border-b border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90 sm:gap-2.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
              <Home className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-tight text-zinc-950 sm:text-lg dark:text-zinc-50">
              Abangers
            </span>
          </Link>

          <nav className="flex items-center gap-1.5 sm:gap-3">
            <Link
              href="/"
              className="rounded-xl px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:px-3.5 sm:py-2 sm:text-sm dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
              Home
            </Link>
            <HeaderAuthButtons
              isAuthenticated={Boolean(user)}
              dashboardPath={dashboardPath}
            />
          </nav>
        </div>
      </header>

      {/* Main Content: Natural document scrolling down the page */}
      <main className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 lg:px-8">
        {/* After a missing listing's redirect: say why they landed here (#93) */}
        {showMissingListingNote && (
          <div
            role="status"
            className="mb-4 flex shrink-0 items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p>{MISSING_PUBLIC_LISTING_NOTE}</p>
          </div>
        )}

        <div className="flex h-full min-h-0 w-full flex-1 flex-col">
          {/* Error state if database query fails (distinct from 0 listings) */}
          {error ? (
            <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center dark:border-rose-900/60 dark:bg-rose-950/30">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-bold text-rose-950 dark:text-rose-100">
                Unable to load listings right now
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-rose-700 sm:text-sm dark:text-rose-300">
                We ran into a temporary problem reaching the database. Please
                refresh the page or try again in a moment.
              </p>
              <div className="mt-5">
                <Link
                  href="/listings"
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-rose-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try Again
                </Link>
              </div>
            </div>
          ) : (
            <PublicListingsView
              listings={listings}
              initialFilters={initialFilters}
              userRole={userRole}
              isAuthenticated={Boolean(user)}
              variant="public"
            />
          )}
        </div>
      </main>
    </div>
  );
}
