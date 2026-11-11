import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getFavoritedListings } from "@/lib/favorites";
import RenterFavoritesView from "@/components/RenterFavoritesView";
import { Button } from "@/components/ui/button";

export default async function RenterFavoritesPage() {
  const supabase = await createClient();
  const result = await getFavoritedListings(supabase);

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Favorites
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Keep track of boarding houses and dorms you are interested in.
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-rose-950 dark:text-rose-100">
            Unable to load favorites
          </h2>
          <p className="text-muted-foreground mx-auto mt-1.5 max-w-sm text-sm">
            {result.error}
          </p>
          <div className="mt-6">
            <Button
              asChild
              variant="outline"
              className="border-rose-300 dark:border-rose-800"
            >
              <Link href="/dashboard/renter/favorites">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <RenterFavoritesView initialListings={result.listings} />;
}
