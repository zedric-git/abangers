"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackToListingsButtonProps {
  className?: string;
}

/**
 * Smart back navigation button for listing details (S2-05, #15).
 * Navigates back in browser history to preserve active search keywords
 * and filter criteria, falling back to /listings if accessed directly.
 */
export default function BackToListingsButton({
  className = "",
}: BackToListingsButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/listings");
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Listings
    </button>
  );
}
