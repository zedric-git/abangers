"use client";

import { toPhMobileDigits } from "@/lib/ph-mobile-number";
import { cn } from "@/lib/utils";

type PhMobileNumberInputProps = {
  id: string;
  /** The 10 digits after +63 ("9171234567"), not the saved "09..." form. */
  value: string;
  onChange: (digits: string) => void;
  /** Extra classes for the box around the field, e.g. its height. */
  className?: string;
  "aria-describedby"?: string;
  "aria-labelledby"?: string;
};

/**
 * The landlord's contact number: a fixed "+63", then the 10 digits after
 * it (#225). Used by ProfileSetupModal and LandlordProfileForm, which load
 * a saved number with toPhMobileDigits() and save
 * toStoredPhMobileNumber(value) (src/lib/ph-mobile-number.ts).
 *
 * - inputMode="numeric" opens the number pad on phones (digits only).
 * - Every change goes through toPhMobileDigits(), so letters, symbols and
 *   spaces never stay in the field, a pasted or autofilled "0917..." or
 *   "+63 917..." becomes the 10 digits, and it stops at 10.
 * - No maxLength, on purpose: the browser cuts pasted text to fit BEFORE
 *   onChange sees it, so "+63 917 123 4567" would arrive as "+63 917 12".
 */
export default function PhMobileNumberInput({
  id,
  value,
  onChange,
  className,
  "aria-describedby": ariaDescribedBy,
  "aria-labelledby": ariaLabelledBy,
}: PhMobileNumberInputProps) {
  return (
    <div
      className={cn(
        "flex h-11 w-full items-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100/70 transition-colors focus-within:border-purple-600 focus-within:bg-zinc-100 focus-within:ring-1 focus-within:ring-purple-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:focus-within:border-purple-500 dark:focus-within:bg-zinc-800",
        className,
      )}
    >
      {/* Not part of the value. Screen readers get "+63" from the hint
          under the field (aria-describedby). */}
      <span
        aria-hidden="true"
        className="flex h-full items-center border-r border-zinc-200 pr-3 pl-4 text-sm font-semibold text-zinc-500 select-none dark:border-zinc-700 dark:text-zinc-400"
      >
        +63
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        required
        placeholder="9171234567"
        aria-describedby={ariaDescribedBy}
        aria-labelledby={ariaLabelledBy}
        value={value}
        onChange={(e) => onChange(toPhMobileDigits(e.target.value))}
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder-zinc-500"
      />
    </div>
  );
}
