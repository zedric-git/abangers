import Link from "next/link";
import { AlertCircle, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { parseSearchQuery } from "@/lib/search-listings";
import PublicListingsView from "@/components/PublicListingsView";

interface ListingsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const metadata = {
  title: "Browse Listings | Abangers",
  description:
    "Search boarding houses, bedspaces, and apartments for rent near universities and workplaces in Cebu.",
};

export default async function ListingsPage({
  searchParams,
}: ListingsPageProps) {
  const resolvedParams = await searchParams;
  const initialQuery = parseSearchQuery(resolvedParams);

  const supabase = await createClient();

  const { data: rawListings, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load listings:", error);
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
        <div className="mx-auto max-w-5xl">
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="font-semibold">Unable to load listings</h2>
              <p className="mt-1">
                We couldn&apos;t load listings right now. Please refresh the
                page or try again in a few moments.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      {/* Top Header / Navigation */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
              <Home className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Abangers
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <PublicListingsView
          initialListings={rawListings ?? []}
          initialQuery={initialQuery}
        />
      </main>
    </div>
  );
}
