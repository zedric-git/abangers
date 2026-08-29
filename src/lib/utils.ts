import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names, resolving conflicts (e.g. "p-2 p-4" -> "p-4").
 * Used by every shadcn/ui component — pull this in whenever a component
 * accepts a `className` prop that should be combinable with its defaults.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
