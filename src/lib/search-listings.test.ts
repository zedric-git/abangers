import { describe, expect, it } from "vitest";
import {
  matchesListingSearch,
  type SearchableListing,
} from "./search-listings";

const sampleListings: SearchableListing[] = [
  {
    title: "Santos Boarding House near USC Talamban",
    address: "Nasipit Rd, Talamban, Cebu City",
    city: "Cebu City",
    description: "Curfew 10 PM. Quiet study area near USC campus.",
  },
  {
    title: "Air-conditioned Bedspace in Lahug (near UP Cebu)",
    address: "Gorordo Ave, Lahug, Cebu City",
    city: "Cebu City",
    description: "Walking distance to UP Cebu and JY Square Mall.",
  },
  {
    title: "IT Park Studio Rooms for Working Professionals",
    address: "Salinas Dr, Apas, Cebu City",
    city: "Cebu City",
    description: "Convenient for IT Park BPO employees. 24/7 security.",
  },
  {
    title: "Dela Cruz Dorm — walking distance to UC Main",
    address: "Sanciangko St, Cebu City",
    city: "Cebu City",
    description: null,
  },
  {
    title: "Budget Rooms near Mandaue Public Market",
    address: "A. Del Rosario St, Mandaue City",
    city: "Mandaue City",
    description: "Affordable room near Mandaue city hall and public market.",
  },
];

describe("matchesListingSearch (S2-04, #88)", () => {
  it("matches all listings when query is empty or whitespace", () => {
    expect(matchesListingSearch(sampleListings[0], "")).toBe(true);
    expect(matchesListingSearch(sampleListings[0], "   ")).toBe(true);
  });

  it("matches by city name (case-insensitive)", () => {
    expect(matchesListingSearch(sampleListings[4], "mandaue")).toBe(true);
    expect(matchesListingSearch(sampleListings[4], "MANDAUE CITY")).toBe(true);
    expect(matchesListingSearch(sampleListings[0], "Mandaue")).toBe(false);
  });

  it("matches by street / address keyword", () => {
    expect(matchesListingSearch(sampleListings[0], "Nasipit")).toBe(true);
    expect(matchesListingSearch(sampleListings[1], "gorordo")).toBe(true);
    expect(matchesListingSearch(sampleListings[3], "sanciangko")).toBe(true);
  });

  it("matches by title keywords", () => {
    expect(matchesListingSearch(sampleListings[0], "santos")).toBe(true);
    expect(matchesListingSearch(sampleListings[2], "Studio Rooms")).toBe(true);
  });

  it("matches university names in title or description", () => {
    expect(matchesListingSearch(sampleListings[0], "USC")).toBe(true);
    expect(matchesListingSearch(sampleListings[1], "UP Cebu")).toBe(true);
    expect(matchesListingSearch(sampleListings[3], "UC Main")).toBe(true);
  });

  it("matches workplace or commercial landmark names", () => {
    expect(matchesListingSearch(sampleListings[2], "IT Park")).toBe(true);
    expect(matchesListingSearch(sampleListings[1], "JY Square")).toBe(true);
    expect(matchesListingSearch(sampleListings[2], "BPO")).toBe(true);
  });

  it("handles null or undefined city and description cleanly", () => {
    const listingWithNulls: SearchableListing = {
      title: "Simple Dorm",
      address: "Downtown Cebu",
      city: null,
      description: null,
    };
    expect(matchesListingSearch(listingWithNulls, "Dorm")).toBe(true);
    expect(matchesListingSearch(listingWithNulls, "Nowhere")).toBe(false);
  });

  it("matches multi-token queries across different fields", () => {
    // "Talamban" is in address, "USC" is in title/description
    expect(matchesListingSearch(sampleListings[0], "Talamban USC")).toBe(true);
    // "Lahug" is in address, "Bedspace" is in title
    expect(matchesListingSearch(sampleListings[1], "Bedspace Lahug")).toBe(
      true,
    );
  });

  it("handles special characters safely without throwing", () => {
    expect(matchesListingSearch(sampleListings[1], "(near UP Cebu)")).toBe(
      true,
    );
    expect(matchesListingSearch(sampleListings[3], "Dorm — walking")).toBe(
      true,
    );
    expect(matchesListingSearch(sampleListings[0], "???")).toBe(false);
    expect(matchesListingSearch(sampleListings[0], "*")).toBe(false);
  });

  it("returns false when nothing matches", () => {
    expect(matchesListingSearch(sampleListings[0], "Davao City")).toBe(false);
  });
});
