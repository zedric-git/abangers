/**
 * What Find a Place and /listings say when a search leaves nothing to show
 * (S2-10, plan update on #28). The cards and the map both use this, so
 * they always give the same reason.
 *
 * It names the most likely cause, in this order:
 * 1. there are no available listings at all;
 * 2. (the map only) there are results, but none has a pin to show;
 * 3. the search bar's words aren't in any listing;
 * 4. nothing is within the radius of the search point;
 * 5. the other filters ruled everything out.
 */

import { formatRadius } from "@/lib/geo";

export type EmptyResultsReason =
  "no-listings" | "no-pins" | "words" | "radius" | "filters";

/** How the search bar's place lookup went for the words in it. */
export type PlaceLookupStatus = "searching" | "not-found" | "failed";

export interface EmptyResultsInput {
  /** How many available listings the page loaded, before any search. */
  totalListings: number;
  /** The words in the search bar, trimmed ("" for none). */
  searchWords: string;
  /** True when no loaded listing's name, address or description has the words. */
  wordsMatchNoListing: boolean;
  /** The place lookup for these words, if Search has been pressed. */
  placeLookup: PlaceLookupStatus | null;
  /** The radius search's point, or null when there's none. */
  center: { label: string | null } | null;
  radiusKm: number;
  /** For the map: results that have no pin, so they can't be shown (0 for the cards). */
  resultsWithoutPins?: number;
}

export interface EmptyResultsMessage {
  reason: EmptyResultsReason;
  title: string;
  hint: string;
}

// Long words would stretch the message, so they're cut short in it.
const MAX_WORDS_SHOWN = 40;

function shortWords(words: string): string {
  return words.length > MAX_WORDS_SHOWN
    ? `${words.slice(0, MAX_WORDS_SHOWN)}...`
    : words;
}

const PLACE_LOOKUP_HINTS: Record<PlaceLookupStatus | "not-yet", string> = {
  "not-yet": "Press Search to look for rentals near it.",
  searching: "Looking for it on the map...",
  "not-found":
    "Couldn't find it on the map either. Check the spelling, or try a nearby landmark.",
  failed:
    "Couldn't look it up on the map right now. Try again in a moment, or pick a spot on the map.",
};

export function emptyResultsMessage(
  input: EmptyResultsInput,
): EmptyResultsMessage {
  if (input.totalListings === 0) {
    return {
      reason: "no-listings",
      title: "No rentals available right now",
      hint: "Check back soon as verified landlords post new boarding houses and rooms.",
    };
  }

  const unpinned = input.resultsWithoutPins ?? 0;
  if (unpinned > 0) {
    return {
      reason: "no-pins",
      title:
        unpinned === 1
          ? "1 rental matches, but it isn't pinned on the map"
          : `${unpinned} rentals match, but they aren't pinned on the map`,
      hint: `Switch to the list to see ${unpinned === 1 ? "it" : "them"}.`,
    };
  }

  if (input.searchWords !== "" && input.wordsMatchNoListing) {
    return {
      reason: "words",
      title: `No rentals found for "${shortWords(input.searchWords)}"`,
      hint: PLACE_LOOKUP_HINTS[input.placeLookup ?? "not-yet"],
    };
  }

  if (input.center) {
    return {
      reason: "radius",
      title: `No rentals within ${formatRadius(input.radiusKm)} of ${input.center.label ?? "the pin"}`,
      hint: "Try a bigger distance, or pick another spot.",
    };
  }

  return {
    reason: "filters",
    title: "No rentals match your filters",
    hint: "Try a wider rent range, or remove a few filters.",
  };
}
