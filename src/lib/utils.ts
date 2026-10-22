import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names, resolving conflicts (e.g. "p-2 p-4" -> "p-4").
 * For our own components — pull this in whenever a component accepts a
 * `className` prop that should be combinable with its defaults.
 *
 * The shadcn/ui components in src/components/ui don't use this one: the
 * shadcn CLI writes them to import `cn` from the `cn` package, which does
 * the same job. Leave those imports as the CLI wrote them.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
