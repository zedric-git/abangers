import { describe, expect, it } from "vitest";
import type { Listing } from "@/types/listing";
import {
  availabilityStatusSchema,
  listingRowToFormValues,
  listingSchema,
  parseAvailabilityStatus,
  type ListingInput,
} from "./listing";

// A row with every optional column empty, as Supabase returns it.
const sparseRow: Listing = {
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
  city: null,
  total_rooms: null,
  property_type: null,
  occupancy_type: null,
  allowed_gender: null,
  utilities: null,
  room_features: null,
  bathroom_features: null,
  kitchen_features: null,
  laundry_features: null,
  safety_features: null,
  description: null,
  house_rules: null,
  images: null,
  cover_image: null,
  latitude: null,
  longitude: null,
};

// A listing that passes every rule, as the form sends it.
const validListing: ListingInput = {
  title: "Room near USC",
  address: "123 Sanciangko St",
  city: "Cebu City",
  monthly_rent: 3500,
  total_rooms: 4,
  available_rooms: 2,
  property_type: "Boarding House",
  occupancy_type: "Bedspace",
  allowed_gender: "Any / Co-ed",
  amenities: [],
  utilities: [],
  room_features: [],
  bathroom_features: [],
  kitchen_features: [],
  laundry_features: [],
  safety_features: [],
  images: ["https://example.com/photo.jpg"],
  cover_image: "https://example.com/photo.jpg",
  latitude: 10.3,
  longitude: 123.9,
  contact_info: "0917 000 0000",
  availability_status: "available",
};

describe("listingSchema room counts", () => {
  it("refuses more available rooms than total rooms, on available_rooms", () => {
    const result = listingSchema.safeParse({
      ...validListing,
      total_rooms: 2,
      available_rooms: 5,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toHaveLength(1);
    expect(result.error?.issues[0].path).toEqual(["available_rooms"]);
    expect(result.error?.issues[0].message).toBe(
      "Available rooms can't be more than total rooms",
    );
  });

  it.each([
    ["fewer", 1],
    ["equal", 4],
    ["0", 0],
  ])("accepts %s available rooms out of 4", (_label, available) => {
    const result = listingSchema.safeParse({
      ...validListing,
      total_rooms: 4,
      available_rooms: available,
    });
    expect(result.success).toBe(true);
  });

  it("compares the numbers the form sends as text", () => {
    const result = listingSchema.safeParse({
      ...validListing,
      total_rooms: "2",
      available_rooms: "10",
    });
    expect(result.error?.issues[0].path).toEqual(["available_rooms"]);
  });

  it("still reports the rooms while another field is invalid", () => {
    // No map pin yet: without the refine's `when`, Zod would skip the
    // rooms check until the pin is set.
    const result = listingSchema.safeParse({
      ...validListing,
      latitude: undefined,
      total_rooms: 2,
      available_rooms: 5,
    });
    const paths = result.error?.issues.map((issue) => issue.path[0]);
    expect(paths).toContain("latitude");
    expect(paths).toContain("available_rooms");
  });

  it("returns an error instead of throwing when the input isn't a listing", () => {
    // A server action can be called with anything.
    expect(listingSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("availabilityStatusSchema", () => {
  it("accepts only the three statuses the database allows", () => {
    expect(availabilityStatusSchema.options).toEqual([
      "available",
      "almost_full",
      "fully_occupied",
    ]);
    expect(availabilityStatusSchema.safeParse("unavailable").success).toBe(
      false,
    );
  });
});

describe("parseAvailabilityStatus", () => {
  it("keeps the three allowed values", () => {
    expect(parseAvailabilityStatus("almost_full")).toBe("almost_full");
    expect(parseAvailabilityStatus("fully_occupied")).toBe("fully_occupied");
  });

  it("falls back to available for anything else", () => {
    expect(parseAvailabilityStatus("sold_out")).toBe("available");
    expect(parseAvailabilityStatus(null)).toBe("available");
  });
});

describe("listingRowToFormValues", () => {
  it("turns null columns into undefined or empty arrays, never null", () => {
    const values = listingRowToFormValues(sparseRow);
    expect(Object.values(values)).not.toContain(null);
    expect(values.city).toBeUndefined();
    expect(values.images).toEqual([]);
    expect(values.utilities).toEqual([]);
  });

  it("passes real values through unchanged", () => {
    const values = listingRowToFormValues({
      ...sparseRow,
      city: "Cebu City",
      latitude: 10.3,
      longitude: 123.9,
    });
    expect(values.monthly_rent).toBe(3500);
    expect(values.city).toBe("Cebu City");
    expect(values.latitude).toBe(10.3);
    expect(values.amenities).toEqual(["WiFi"]);
  });

  it("keeps 0 available rooms", () => {
    // `0 || 1` on the edit page turned a full listing into 1 free room.
    const values = listingRowToFormValues({
      ...sparseRow,
      total_rooms: 3,
      available_rooms: 0,
      availability_status: "fully_occupied",
    });
    expect(values.available_rooms).toBe(0);
    expect(values.availability_status).toBe("fully_occupied");
  });
});
