import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database";
import type { Listing } from "@/types/listing";
import { INVALID_UUID_ERROR_CODE } from "@/lib/listing-lookup";
import { fetchListingById } from "./fetch-listing";

const sampleRow: Listing = {
  id: "a1b2c3d4-0000-4000-8000-000000000001",
  landlord_id: "00000000-0000-0000-0000-000000000001",
  title: "Room near USC",
  address: "123 Sanciangko St",
  monthly_rent: 3500,
  available_rooms: 2,
  amenities: ["WiFi"],
  contact_info: "0917 000 0000",
  availability_status: "available",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  city: "Cebu City",
  total_rooms: 4,
  property_type: "Boarding House",
  occupancy_type: "Bedspace",
  allowed_gender: "Any / Co-ed",
  utilities: null,
  room_features: null,
  bathroom_features: null,
  kitchen_features: null,
  laundry_features: null,
  safety_features: null,
  description: "Spacious student room.",
  house_rules: null,
  images: ["https://example.com/photo1.jpg"],
  cover_image: "https://example.com/photo1.jpg",
  latitude: 10.3,
  longitude: 123.9,
};

function makeClient(result: {
  data: Listing | null;
  error: { code: string; message: string } | null;
}): { client: SupabaseClient<Database>; queriedId: () => string | null } {
  let seenId: string | null = null;
  const client = {
    from: () => ({
      select: () => ({
        eq: (_col: string, val: string) => {
          seenId = val;
          return {
            maybeSingle: async () => result,
          };
        },
      }),
    }),
  };
  return {
    client: client as unknown as SupabaseClient<Database>,
    queriedId: () => seenId,
  };
}

describe("fetchListingById (#94)", () => {
  it("returns found with listing and converted formValues when a row exists", async () => {
    const { client, queriedId } = makeClient({ data: sampleRow, error: null });
    const res = await fetchListingById(client, sampleRow.id);

    expect(queriedId()).toBe(sampleRow.id);
    expect(res.kind).toBe("found");
    if (res.kind === "found") {
      expect(res.listing).toEqual(sampleRow);
      expect(res.formValues.title).toBe("Room near USC");
      expect(res.formValues.monthly_rent).toBe(3500);
      expect(res.formValues.utilities).toEqual([]);
    }
  });

  it("returns missing when no row matches the id", async () => {
    const { client } = makeClient({ data: null, error: null });
    const res = await fetchListingById(
      client,
      "a1b2c3d4-0000-4000-8000-999999999999",
    );

    expect(res).toEqual({ kind: "missing" });
  });

  it("returns missing when the id in the URL is not a valid UUID", async () => {
    const { client } = makeClient({
      data: null,
      error: {
        code: INVALID_UUID_ERROR_CODE,
        message: 'invalid input syntax for type uuid: "not-a-uuid"',
      },
    });
    const res = await fetchListingById(client, "not-a-uuid");

    expect(res).toEqual({ kind: "missing" });
  });

  it("returns failed when the database query fails", async () => {
    const dbError = { code: "08006", message: "connection failure" };
    const { client } = makeClient({ data: null, error: dbError });
    const res = await fetchListingById(client, sampleRow.id);

    expect(res).toEqual({ kind: "failed", error: dbError });
  });
});
