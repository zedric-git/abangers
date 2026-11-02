import Link from "next/link";
import { User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RenterProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Renter Profile
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your personal details, contact info, and rental preferences.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
            <User className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Profile Management</h2>
            <p className="text-muted-foreground text-sm">
              Your profile helps landlords know who is inquiring or requesting
              viewings. If you haven&apos;t completed your profile setup yet,
              you can do so below.
            </p>
            <div className="pt-4">
              <Button asChild variant="outline">
                <Link href="/renter/profile-setup">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Renter Profile Setup
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
