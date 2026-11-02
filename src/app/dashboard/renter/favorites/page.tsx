import Link from "next/link";
import { Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RenterFavoritesPage() {
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

      <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/40">
          <Heart className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-semibold">No favorites saved yet</h2>
        <p className="text-muted-foreground mx-auto mt-1.5 max-w-sm text-sm">
          Browse through available boarding houses and click the heart icon on
          any listing to bookmark it.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/listings">
              <Search className="mr-2 h-4 w-4" />
              Find a Place
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
