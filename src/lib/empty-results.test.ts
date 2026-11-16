import { describe, expect, it } from "vitest";
import { emptyResultsMessage, type EmptyResultsInput } from "./empty-results";

// A search that found nothing, with no words, point or pins involved:
// each test changes only what it's about.
const base: EmptyResultsInput = {
  totalListings: 5,
  searchWords: "",
  wordsMatchNoListing: false,
  placeLookup: null,
  center: null,
  radiusKm: 5,
};

describe("emptyResultsMessage", () => {
  it("says there's nothing posted when no listings are available", () => {
    const message = emptyResultsMessage({
      ...base,
      totalListings: 0,
      searchWords: "Lahug",
      wordsMatchNoListing: true,
    });
    expect(message.reason).toBe("no-listings");
    expect(message.title).toBe("No rentals available right now");
  });

  it("explains results the map can't show because they have no pin", () => {
    expect(emptyResultsMessage({ ...base, resultsWithoutPins: 1 })).toEqual({
      reason: "no-pins",
      title: "1 rental matches, but it isn't pinned on the map",
      hint: "Switch to the list to see it.",
    });
    expect(emptyResultsMessage({ ...base, resultsWithoutPins: 2 }).title).toBe(
      "2 rentals match, but they aren't pinned on the map",
    );
  });

  it("names the words when no listing has them, and offers to look them up", () => {
    expect(
      emptyResultsMessage({
        ...base,
        searchWords: "Lahug",
        wordsMatchNoListing: true,
      }),
    ).toEqual({
      reason: "words",
      title: 'No rentals found for "Lahug"',
      hint: "Press Search to look for rentals near it.",
    });
  });

  it("follows the place lookup for the words", () => {
    const words = { ...base, searchWords: "Lahug", wordsMatchNoListing: true };
    expect(
      emptyResultsMessage({ ...words, placeLookup: "searching" }).hint,
    ).toBe("Looking for it on the map...");
    expect(
      emptyResultsMessage({ ...words, placeLookup: "not-found" }).hint,
    ).toMatch(/^Couldn't find it on the map either/);
    expect(
      emptyResultsMessage({ ...words, placeLookup: "failed" }).hint,
    ).toMatch(/^Couldn't look it up on the map right now/);
  });

  it("cuts long words short in the message", () => {
    const words = "a".repeat(60);
    expect(
      emptyResultsMessage({
        ...base,
        searchWords: words,
        wordsMatchNoListing: true,
      }).title,
    ).toBe(`No rentals found for "${"a".repeat(40)}..."`);
  });

  it("puts words that match nothing ahead of the search point", () => {
    expect(
      emptyResultsMessage({
        ...base,
        searchWords: "xyz",
        wordsMatchNoListing: true,
        center: { label: null },
      }).reason,
    ).toBe("words");
  });

  it("names the radius and the point when nothing is within reach", () => {
    expect(
      emptyResultsMessage({ ...base, center: { label: "Lahug" }, radiusKm: 1 }),
    ).toEqual({
      reason: "radius",
      title: "No rentals within 1 km of Lahug",
      hint: "Try a bigger distance, or pick another spot.",
    });
    expect(
      emptyResultsMessage({ ...base, center: { label: null }, radiusKm: 0.5 })
        .title,
    ).toBe("No rentals within 500 m of the pin");
  });

  it("blames the radius, not the words, when the words do match a listing", () => {
    expect(
      emptyResultsMessage({
        ...base,
        searchWords: "Santos",
        wordsMatchNoListing: false,
        center: { label: "IT Park" },
      }).reason,
    ).toBe("radius");
  });

  it("falls back to the filters", () => {
    expect(emptyResultsMessage(base)).toEqual({
      reason: "filters",
      title: "No rentals match your filters",
      hint: "Try a wider rent range, or remove a few filters.",
    });
  });
});
