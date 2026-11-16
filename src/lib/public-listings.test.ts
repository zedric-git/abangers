import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  BROWSABLE_LISTING_STATUSES,
  PUBLIC_LISTING_COLUMNS,
  loadBrowsableListings,
} from "./public-listings";

// Records each call the query makes, in order.
function makeMockClient() {
  const calls: unknown[][] = [];
  const query = {
    select: (...args: unknown[]) => {
      calls.push(["select", ...args]);
      return query;
    },
    in: (...args: unknown[]) => {
      calls.push(["in", ...args]);
      return query;
    },
    order: (...args: unknown[]) => {
      calls.push(["order", ...args]);
      return query;
    },
  };
  const client = {
    from: (table: string) => {
      calls.push(["from", table]);
      return query;
    },
  };
  return { client: client as unknown as SupabaseClient<Database>, calls };
}

describe("the browse pages' listings (#309)", () => {
  it("shows available and almost-full listings", () => {
    expect(BROWSABLE_LISTING_STATUSES).toEqual(["available", "almost_full"]);
  });

  it("leaves fully occupied listings off", () => {
    expect(BROWSABLE_LISTING_STATUSES).not.toContain("fully_occupied");
  });

  it("loads those statuses, newest first", () => {
    const { client, calls } = makeMockClient();
    loadBrowsableListings(client);
    expect(calls).toEqual([
      ["from", "listings"],
      ["select", PUBLIC_LISTING_COLUMNS],
      ["in", "availability_status", ["available", "almost_full"]],
      ["order", "created_at", { ascending: false }],
    ]);
  });

  it("never asks for the landlord's contact details", () => {
    expect(PUBLIC_LISTING_COLUMNS).not.toContain("contact_info");
  });
});
