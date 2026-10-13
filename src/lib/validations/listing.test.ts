import { describe, expect, it } from "vitest";
import type { Listing } from "@/types/listing";
import { listingRowToFormValues, parseAvailabilityStatus } from "./listing";

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
});
