import Link from "next/link";
import { Search, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RenterDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome to Abangers
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Discover verified boarding houses, dormitories, and rooms near your
          school or workplace.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">
          Ready to find your next home?
        </h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
          Browse through verified boarding houses with genuine landlord details,
          photos, amenities, prices, and map locations.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            className="bg-purple-600 text-white shadow-xs hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500"
          >
            <Link href="/listings">
              <Search className="mr-2 h-4 w-4" />
              Find a Place
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/renter/favorites">
              <Heart className="mr-2 h-4 w-4 text-rose-500" />
              My Favorites
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
