import { describe, expect, it } from "vitest";
import { listingSchema } from "@/lib/validations/listing";
import {
  countListingsByStatus,
  LISTING_STATUSES,
  listingStatusView,
} from "./listing-status-view";

describe("LISTING_STATUSES", () => {
  it("lists exactly the statuses the listing schema allows", () => {
    expect(LISTING_STATUSES).toEqual(
      listingSchema.shape.availability_status.unwrap().options,
    );
  });
});

describe("listingStatusView", () => {
  it("shows Available in green, in the Active group", () => {
    const view = listingStatusView("available");
    expect(view.status).toBe("available");
    expect(view.label).toBe("Available");
    expect(view.group).toBe("active");
    expect(view.badgeClassName).toContain("bg-emerald-");
  });

  it("shows Almost Full in amber, in the Active group", () => {
    const view = listingStatusView("almost_full");
    expect(view.status).toBe("almost_full");
    expect(view.label).toBe("Almost Full");
    expect(view.group).toBe("active");
    expect(view.badgeClassName).toContain("bg-amber-");
  });

  it("shows Fully Occupied in red, in the Occupied group", () => {
    const view = listingStatusView("fully_occupied");
    expect(view.status).toBe("fully_occupied");
    expect(view.label).toBe("Fully Occupied");
    expect(view.group).toBe("occupied");
    expect(view.badgeClassName).toContain("bg-rose-");
  });

  it("gives every status its own label and colour", () => {
    const views = LISTING_STATUSES.map((status) => listingStatusView(status));
    expect(new Set(views.map((view) => view.label)).size).toBe(3);
    expect(new Set(views.map((view) => view.badgeClassName)).size).toBe(3);
  });

  it.each([
    ["an old status the database can't hold", "unavailable"],
    ["another old status", "occupied"],
    ["an empty string", ""],
    ["null", null],
    ["undefined", undefined],
  ])("shows %s as Available", (_, value) => {
    expect(listingStatusView(value).status).toBe("available");
    expect(listingStatusView(value).label).toBe("Available");
  });
});

describe("countListingsByStatus", () => {
  it("counts each status, and an unknown one as Available", () => {
    const listings = [
      { availability_status: "available" },
      { availability_status: "available" },
      { availability_status: "almost_full" },
      { availability_status: "fully_occupied" },
      { availability_status: "unavailable" },
    ];
    expect(countListingsByStatus(listings)).toEqual({
      available: 3,
      almost_full: 1,
      fully_occupied: 1,
    });
  });

  it("is all zeros with no listings", () => {
    expect(countListingsByStatus([])).toEqual({
      available: 0,
      almost_full: 0,
      fully_occupied: 0,
    });
  });
});
