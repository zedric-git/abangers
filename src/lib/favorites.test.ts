import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  addFavorite,
  removeFavorite,
  getFavoritedListingIds,
  getFavoritedListings,
  DUPLICATE_KEY_ERROR_CODE,
  FAVORITE_SAVE_ERROR_MESSAGE,
  FAVORITE_REMOVE_ERROR_MESSAGE,
  FAVORITE_UNAUTHENTICATED_MESSAGE,
  FAVORITES_LOAD_ERROR_MESSAGE,
} from "./favorites";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const TEST_LISTING_ID = "11111111-1111-1111-1111-111111111111";

function makeMockClient({
  userId = TEST_USER_ID as string | null,
  insertError = null as { code: string; message: string } | null,
  deleteError = null as { code: string; message: string } | null,
  selectData = null as unknown[] | null,
  selectError = null as { code: string; message: string } | null,
} = {}) {
  let insertedPayload: unknown = null;
  const deletedFilters: Record<string, string> = {};

  const client = {
    auth: {
      getUser: async () => ({
        data: { user: userId ? { id: userId } : null },
      }),
    },
    from: (table: string) => {
      if (table !== "favorites") {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        insert: async (payload: unknown) => {
          insertedPayload = payload;
          return { error: insertError };
        },
        delete: () => {
          const chain = {
            eq: (col: string, val: string) => {
              deletedFilters[col] = val;
              return chain;
            },
            then: async (
              resolve: (val: { error: typeof deleteError }) => unknown,
            ) => resolve({ error: deleteError }),
          };
          return chain;
        },
        select: () => {
          const chain = {
            eq: () => chain,
            order: () => chain,
            then: async (
              resolve: (val: {
                data: typeof selectData;
                error: typeof selectError;
              }) => unknown,
            ) => resolve({ data: selectData, error: selectError }),
          };
          return chain;
        },
      };
    },
  };

  return {
    client: client as unknown as SupabaseClient<Database>,
    getInserted: () => insertedPayload,
    getDeletedFilters: () => deletedFilters,
  };
}

describe("addFavorite (#97)", () => {
  it("inserts a new favorite successfully", async () => {
    const { client, getInserted } = makeMockClient();
    const result = await addFavorite(client, TEST_LISTING_ID);

    expect(result).toEqual({ ok: true });
    expect(getInserted()).toEqual({
      renter_id: TEST_USER_ID,
      listing_id: TEST_LISTING_ID,
    });
  });

  it("treats duplicate key (23505) as successfully saved", async () => {
    const { client } = makeMockClient({
      insertError: {
        code: DUPLICATE_KEY_ERROR_CODE,
        message:
          'duplicate key value violates unique constraint "favorites_pkey"',
      },
    });
    const result = await addFavorite(client, TEST_LISTING_ID);

    expect(result).toEqual({ ok: true });
  });

  it("returns a user-friendly error when the insert fails", async () => {
    const { client } = makeMockClient({
      insertError: {
        code: "42501",
        message: "permission denied for table favorites",
      },
    });
    const result = await addFavorite(client, TEST_LISTING_ID);

    expect(result).toEqual({
      ok: false,
      error: FAVORITE_SAVE_ERROR_MESSAGE,
    });
  });

  it("returns unauthenticated error when user is not logged in", async () => {
    const { client } = makeMockClient({ userId: null });
    const result = await addFavorite(client, TEST_LISTING_ID);

    expect(result).toEqual({
      ok: false,
      error: FAVORITE_UNAUTHENTICATED_MESSAGE,
    });
  });
});

describe("removeFavorite (#97)", () => {
  it("deletes an existing favorite successfully", async () => {
    const { client, getDeletedFilters } = makeMockClient();
    const result = await removeFavorite(client, TEST_LISTING_ID);

    expect(result).toEqual({ ok: true });
    expect(getDeletedFilters()).toEqual({
      renter_id: TEST_USER_ID,
      listing_id: TEST_LISTING_ID,
    });
  });

  it("returns a user-friendly error when the delete fails", async () => {
    const { client } = makeMockClient({
      deleteError: {
        code: "42501",
        message: "permission denied for table favorites",
      },
    });
    const result = await removeFavorite(client, TEST_LISTING_ID);

    expect(result).toEqual({
      ok: false,
      error: FAVORITE_REMOVE_ERROR_MESSAGE,
    });
  });

  it("returns unauthenticated error when user is not logged in", async () => {
    const { client } = makeMockClient({ userId: null });
    const result = await removeFavorite(client, TEST_LISTING_ID);

    expect(result).toEqual({
      ok: false,
      error: FAVORITE_UNAUTHENTICATED_MESSAGE,
    });
  });
});

describe("getFavoritedListingIds (#97)", () => {
  it("returns a Set of listing IDs for the user", async () => {
    const { client } = makeMockClient({
      selectData: [
        { listing_id: "id-1" },
        { listing_id: "id-2" },
        { listing_id: "id-3" },
      ],
    });
    const ids = await getFavoritedListingIds(client);

    expect(ids).toBeInstanceOf(Set);
    expect(ids.size).toBe(3);
    expect(ids.has("id-1")).toBe(true);
    expect(ids.has("id-2")).toBe(true);
    expect(ids.has("id-3")).toBe(true);
    expect(ids.has("id-4")).toBe(false);
  });

  it("returns an empty Set when user has no favorites", async () => {
    const { client } = makeMockClient({ selectData: [] });
    const ids = await getFavoritedListingIds(client);

    expect(ids.size).toBe(0);
  });

  it("returns an empty Set when query fails", async () => {
    const { client } = makeMockClient({
      selectError: { code: "50000", message: "Database timeout" },
    });
    const ids = await getFavoritedListingIds(client);

    expect(ids.size).toBe(0);
  });

  it("returns an empty Set when user is not logged in", async () => {
    const { client } = makeMockClient({ userId: null });
    const ids = await getFavoritedListingIds(client);

    expect(ids.size).toBe(0);
  });
});

describe("getFavoritedListings (#98)", () => {
  const sampleListing1 = {
    id: "l-1",
    title: "Cozy Studio near CITU",
    monthly_rent: 4500,
    available_rooms: 2,
    total_rooms: 4,
    property_type: "Studio",
    occupancy_type: "Single",
    allowed_gender: "Any",
    address: "123 N. Bacalso Ave",
    city: "Cebu City",
    description: "Quiet study room",
    cover_image: "https://example.com/1.jpg",
    images: [],
    availability_status: "available",
    created_at: "2026-11-08T00:00:00Z",
  };

  const sampleListing2 = {
    id: "l-2",
    title: "Spacious Bedspace in Lahug",
    monthly_rent: 3000,
    available_rooms: 0,
    total_rooms: 6,
    property_type: "Bedspace",
    occupancy_type: "Shared",
    allowed_gender: "Female only",
    address: "456 Salinas Dr",
    city: "Cebu City",
    description: "Near IT Park",
    cover_image: "https://example.com/2.jpg",
    images: [],
    availability_status: "fully_occupied",
    created_at: "2026-11-07T00:00:00Z",
  };

  it("returns list of favorited listings sorted and filters out missing listings", async () => {
    const { client } = makeMockClient({
      selectData: [
        {
          created_at: "2026-11-09T01:00:00Z",
          listing_id: "l-1",
          listing: sampleListing1,
        },
        {
          created_at: "2026-11-08T01:00:00Z",
          listing_id: "l-2",
          listing: sampleListing2,
        },
        {
          created_at: "2026-11-07T01:00:00Z",
          listing_id: "l-deleted",
          listing: null,
        },
      ],
    });
    const result = await getFavoritedListings(client);

    expect(result).toEqual({
      ok: true,
      listings: [sampleListing1, sampleListing2],
    });
  });

  it("returns unauthenticated error when user is not logged in", async () => {
    const { client } = makeMockClient({ userId: null });
    const result = await getFavoritedListings(client);

    expect(result).toEqual({
      ok: false,
      error: FAVORITE_UNAUTHENTICATED_MESSAGE,
    });
  });

  it("returns user-friendly error message when query fails", async () => {
    const { client } = makeMockClient({
      selectError: {
        code: "50000",
        message: "Failed to connect to database",
      },
    });
    const result = await getFavoritedListings(client);

    expect(result).toEqual({
      ok: false,
      error: FAVORITES_LOAD_ERROR_MESSAGE,
    });
  });
});
