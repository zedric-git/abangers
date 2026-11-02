"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

interface ListingSearchBarProps {
  placeholder?: string;
  className?: string;
}

/**
 * Search bar for public listings (S2-04, #87).
 *
 * Allows renters and guests to search listings by city, street, university,
 * or workplace keyword. Updates the `?q=` URL search parameter on submit
 * or clear, while preserving any other existing query parameters.
 */
export default function ListingSearchBar({
  placeholder = "Search by city, street, university (e.g. USC), or workplace (e.g. IT Park)...",
  className = "",
}: ListingSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";

  const [term, setTerm] = useState(currentQuery);
  const [prevQuery, setPrevQuery] = useState(currentQuery);

  // Sync state during render when URL search params change (e.g. back/forward navigation)
  if (prevQuery !== currentQuery) {
    setPrevQuery(currentQuery);
    setTerm(currentQuery);
  }

  const updateSearch = (newTerm: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = newTerm.trim();

    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }

    const qs = params.toString();
    router.push(qs ? `/listings?${qs}` : "/listings");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearch(term);
  };

  const handleClear = () => {
    setTerm("");
    updateSearch("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={`relative flex w-full items-center gap-2 ${className}`}
    >
      <label htmlFor="listing-search-input" className="sr-only">
        Search listings by city, street, university, or workplace
      </label>

      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400 dark:text-zinc-500">
          <Search className="h-5 w-5" aria-hidden="true" />
        </div>

        <input
          id="listing-search-input"
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={placeholder}
          maxLength={100}
          autoComplete="off"
          className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pr-10 pl-11 text-sm text-zinc-900 shadow-xs transition-colors placeholder:text-zinc-400 focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-600/20 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-purple-500 dark:focus:ring-purple-500/20"
        />

        {term && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <button
        type="submit"
        className="flex h-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-purple-600 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-purple-700 active:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700"
      >
        Search
      </button>
    </form>
  );
}
