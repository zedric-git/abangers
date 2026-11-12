"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface FilterCheckboxOption {
  id: string;
  label: string;
}

export interface FilterCheckboxGroupProps {
  id?: string;
  title: string;
  options: readonly (FilterCheckboxOption | string)[];
  selectedValues: readonly string[];
  onChange: (value: string, checked: boolean) => void;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Reusable collapsible checkbox group component (S2-06.1, #91).
 *
 * Used for listing discovery feature categories (Utilities, Room Features,
 * Bathroom, Kitchen, Laundry, Safety, Parking, and House Rules).
 *
 * Features:
 * - Collapsible accordion disclosure
 * - Active selection counter badge
 * - Accessible checkboxes with connected labels (`htmlFor` -> `id`)
 */
export default function FilterCheckboxGroup({
  id,
  title,
  options,
  selectedValues,
  onChange,
  defaultOpen = false,
  className = "",
}: FilterCheckboxGroupProps) {
  // Normalize options to { id, label }
  const normalizedOptions: FilterCheckboxOption[] = options.map((opt) =>
    typeof opt === "string" ? { id: opt, label: opt } : opt,
  );

  const activeCount = normalizedOptions.filter((opt) =>
    selectedValues.includes(opt.id),
  ).length;

  // Auto-expand if items are selected
  const [isOpen, setIsOpen] = useState(defaultOpen || activeCount > 0);

  const groupId = id ?? title.toLowerCase().replace(/[^\w-]/g, "-");

  return (
    <div
      className={`rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-2.5 transition-colors dark:border-zinc-800/80 dark:bg-zinc-900/40 ${className}`}
    >
      {/* Header Button / Disclosure Toggle */}
      <button
        type="button"
        id={`group-btn-${groupId}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={`group-panel-${groupId}`}
        className="flex w-full items-center justify-between text-left text-xs font-semibold text-zinc-800 hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white"
      >
        <span className="flex items-center gap-1.5">
          <span>{title}</span>
          {activeCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-600 px-1 text-[10px] font-bold text-white dark:bg-purple-500">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Checkbox Options List */}
      {isOpen && (
        <div
          id={`group-panel-${groupId}`}
          role="group"
          aria-labelledby={`group-btn-${groupId}`}
          className="mt-2.5 space-y-1.5 border-t border-zinc-200/60 pt-2 dark:border-zinc-800/60"
        >
          {normalizedOptions.map((opt) => {
            const isChecked = selectedValues.includes(opt.id);
            const inputId = `filter-${groupId}-${opt.id.toLowerCase().replace(/[^\w-]/g, "-")}`;

            return (
              <label
                key={opt.id}
                htmlFor={inputId}
                className="group flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-xs text-zinc-600 select-none hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
              >
                <div className="relative flex items-center justify-center">
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onChange(opt.id, e.target.checked)}
                    className="peer sr-only"
                  />
                  <div
                    aria-hidden="true"
                    className={`flex h-4 w-4 items-center justify-center rounded-md border transition-all ${
                      isChecked
                        ? "border-purple-600 bg-purple-600 text-white dark:border-purple-500 dark:bg-purple-500"
                        : "border-zinc-300 bg-white group-hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:group-hover:border-zinc-600"
                    }`}
                  >
                    {isChecked && (
                      <Check className="h-3 w-3 stroke-[3] text-white" />
                    )}
                  </div>
                </div>
                <span className="flex-1 leading-tight">{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
