"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

interface ListingSearchBarProps {
  value?: string;
  onSearch?: (term: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

/**
 * Search bar for public listings (S2-04, #87).
 *
 * Allows renters and guests to search listings by city, street, university,
 * or workplace keyword. Dispatches immediate search and clear events.
 */
export default function ListingSearchBar({
  value = "",
  onSearch,
  onClear,
  placeholder = "Search by city, street, university (e.g. USC), or workplace (e.g. IT Park)...",
  className = "",
}: ListingSearchBarProps) {
  const [term, setTerm] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  // Sync state if external value prop changes
  if (prevValue !== value) {
    setPrevValue(value);
    setTerm(value);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(term);
  };

  const handleClear = () => {
    setTerm("");
    if (onClear) {
      onClear();
    } else {
      onSearch?.("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={`relative flex w-full items-center gap-2.5 sm:gap-3 ${className}`}
    >
      <label htmlFor="listing-search-input" className="sr-only">
        Search listings by city, street, university, or workplace
      </label>

      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400 sm:pl-5 dark:text-zinc-500">
          <Search className="h-5 w-5 sm:h-5.5 sm:w-5.5" aria-hidden="true" />
        </div>

        <input
          id="listing-search-input"
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={placeholder}
          maxLength={100}
          autoComplete="off"
          className="h-13 w-full rounded-2xl border border-zinc-200 bg-white pr-10 pl-11 text-sm text-zinc-900 shadow-xs transition-colors placeholder:text-zinc-400 focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-600/20 focus:outline-none sm:h-14 sm:pl-13 sm:text-base dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-purple-500 dark:focus:ring-purple-500/20"
        />

        {term && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3.5 text-zinc-400 transition-colors hover:text-zinc-600 sm:pr-4 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        )}
      </div>

      <button
        type="submit"
        className="flex h-13 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-purple-600 px-6 text-sm font-bold text-white shadow-xs transition-colors hover:bg-purple-700 active:bg-purple-800 sm:h-14 sm:px-8 sm:text-base dark:bg-purple-600 dark:hover:bg-purple-700"
      >
        Search
      </button>
    </form>
  );
}
