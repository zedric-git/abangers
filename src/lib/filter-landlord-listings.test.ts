import { describe, expect, it } from "vitest";
import {
  countListingsByTab,
  filterLandlordListings,
  type FilterableListing,
} from "./filter-landlord-listings";

/** A listing with just the columns the toolbar looks at. */
function listing(
  title: string,
  overrides: Partial<FilterableListing> = {},
): FilterableListing {
  return {
    title,
    address: "123 Sanciangko St",
    city: "Cebu City",
    availability_status: "available",
    ...overrides,
  };
}

const available = listing("Room near USC");
const almostFull = listing("Bedspace in Lahug", {
  address: "45 Gorordo Ave",
  availability_status: "almost_full",
});
const occupied = listing("Studio by the IT Park", {
  address: "8 Salinas Dr",
  city: "Mandaue City",
  availability_status: "fully_occupied",
});
const noCity = listing("Shared room", {
  address: "Talamban Rd",
  city: null,
});

const listings = [available, almostFull, occupied, noCity];

function titles(found: FilterableListing[]): string[] {
  return found.map((item) => item.title);
}

describe("filterLandlordListings: tabs", () => {
  it("All shows every listing, in order", () => {
    expect(
      filterLandlordListings(listings, { tab: "all", search: "" }),
    ).toEqual(listings);
  });

  it("Active shows Available and Almost Full listings", () => {
    expect(
      titles(filterLandlordListings(listings, { tab: "active", search: "" })),
    ).toEqual(["Room near USC", "Bedspace in Lahug", "Shared room"]);
  });

  it("Occupied shows Fully Occupied listings", () => {
    expect(
      titles(filterLandlordListings(listings, { tab: "occupied", search: "" })),
    ).toEqual(["Studio by the IT Park"]);
  });

  it("puts a status the database can't hold under Active, like Available", () => {
    const old = listing("Old row", { availability_status: "unavailable" });
    expect(
      filterLandlordListings([old], { tab: "active", search: "" }),
    ).toEqual([old]);
    expect(
      filterLandlordListings([old], { tab: "occupied", search: "" }),
    ).toEqual([]);
  });
});

describe("filterLandlordListings: search", () => {
  it("matches the title", () => {
    expect(
      titles(filterLandlordListings(listings, { tab: "all", search: "lahug" })),
    ).toEqual(["Bedspace in Lahug"]);
  });

  it("matches the address", () => {
    expect(
      titles(
        filterLandlordListings(listings, { tab: "all", search: "Salinas" }),
      ),
    ).toEqual(["Studio by the IT Park"]);
  });

  it("matches the city", () => {
    expect(
      titles(
        filterLandlordListings(listings, { tab: "all", search: "mandaue" }),
      ),
    ).toEqual(["Studio by the IT Park"]);
  });

  it("ignores case and spaces at either end", () => {
    expect(
      titles(
        filterLandlordListings(listings, {
          tab: "all",
          search: "  ROOM NEAR usc \t",
        }),
      ),
    ).toEqual(["Room near USC"]);
  });

  it("treats a search of only spaces as no search", () => {
    expect(
      filterLandlordListings(listings, { tab: "all", search: "   " }),
    ).toEqual(listings);
  });

  it("works on a listing with no city", () => {
    expect(
      titles(
        filterLandlordListings(listings, { tab: "all", search: "talamban" }),
      ),
    ).toEqual(["Shared room"]);
  });

  it("finds nothing when nothing matches", () => {
    expect(
      filterLandlordListings(listings, { tab: "all", search: "Davao" }),
    ).toEqual([]);
  });
});

describe("filterLandlordListings: tab and search together", () => {
  it("only shows listings on the tab that also match the search", () => {
    // Two listings are in Cebu City, both Active; the Occupied one is in
    // Mandaue, so Occupied + "cebu" finds nothing.
    expect(
      filterLandlordListings(listings, { tab: "occupied", search: "cebu" }),
    ).toEqual([]);
    expect(
      titles(
        filterLandlordListings(listings, { tab: "active", search: "cebu" }),
      ),
    ).toEqual(["Room near USC", "Bedspace in Lahug"]);
  });
});

describe("countListingsByTab", () => {
  it("counts every tab, whatever the search", () => {
    expect(countListingsByTab(listings)).toEqual({
      all: 4,
      active: 3,
      occupied: 1,
    });
  });

  it("is all zeros with no listings", () => {
    expect(countListingsByTab([])).toEqual({ all: 0, active: 0, occupied: 0 });
  });
});
