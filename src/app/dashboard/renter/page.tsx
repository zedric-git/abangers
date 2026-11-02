import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RenterDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Find a Place
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Search properties, apply filters, and explore available boarding
          houses.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
        <div className="bg-primary/10 text-primary mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <Search className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-semibold">
          Explore available listings
        </h2>
        <p className="text-muted-foreground mx-auto mt-1.5 max-w-sm text-sm">
          Search through verified boarding houses with photos, amenities,
          prices, and map locations.
        </p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/listings">
              <Search className="mr-2 h-4 w-4" />
              Browse Listings
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
