import { User } from "lucide-react";

export default function RenterProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Renter Profile
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your personal details, contact info, and rental preferences.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
            <User className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Profile Details</h2>
            <p className="text-muted-foreground text-sm">
              Editing your profile is coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
