import { describe, it, expect } from "vitest";
import {
  canonicalizeFeature,
  normalizeFeatures,
  featureToSlug,
} from "./amenity-aliases";
import { ALL_CANONICAL_FEATURES } from "./listing-features";

describe("amenity-aliases", () => {
  describe("canonicalizeFeature", () => {
    it("maps seed strings to canonical feature names", () => {
      expect(canonicalizeFeature("WiFi")).toBe("Wi-Fi Included");
      expect(canonicalizeFeature("wifi")).toBe("Wi-Fi Included");
      expect(canonicalizeFeature("Wi-Fi")).toBe("Wi-Fi Included");
      expect(canonicalizeFeature("Water included")).toBe("Water Included");
      expect(canonicalizeFeature("Electricity included")).toBe(
        "Electricity Included",
      );
      expect(canonicalizeFeature("Air conditioning")).toBe("Air Conditioning");
      expect(canonicalizeFeature("aircon")).toBe("Air Conditioning");
      expect(canonicalizeFeature("Private CR")).toBe("Private Bathroom/CR");
      expect(canonicalizeFeature("Shared CR")).toBe("Shared Bathroom/CR");
      expect(canonicalizeFeature("Shared kitchen")).toBe("Has Kitchen");
      expect(canonicalizeFeature("Kitchenette")).toBe("Has Kitchen");
      expect(canonicalizeFeature("Laundry area")).toBe("Has Laundry Area");
      expect(canonicalizeFeature("Study area")).toBe("Table/Desk");
      expect(canonicalizeFeature("24/7 security")).toBe("Security Guard");
      expect(canonicalizeFeature("CCTV")).toBe("CCTV");
      expect(canonicalizeFeature("CCTV Surveillance")).toBe("CCTV");
    });

    it("leaves exact canonical feature names unchanged", () => {
      for (const feature of ALL_CANONICAL_FEATURES) {
        expect(canonicalizeFeature(feature)).toBe(feature);
      }
    });

    it("handles case-insensitive canonical matches", () => {
      expect(canonicalizeFeature("wi-fi included")).toBe("Wi-Fi Included");
      expect(canonicalizeFeature("has parking")).toBe("Has Parking");
      expect(canonicalizeFeature("private bathroom/cr")).toBe(
        "Private Bathroom/CR",
      );
    });

    it("returns trimmed original for unknown strings", () => {
      expect(canonicalizeFeature("  Custom Feature  ")).toBe("Custom Feature");
      expect(canonicalizeFeature("")).toBe("");
    });
  });

  describe("normalizeFeatures", () => {
    it("deduplicates and maps mixed seed and canonical strings", () => {
      const raw = [
        "WiFi",
        "Wi-Fi Included",
        "Private CR",
        "Study area",
        "Table/Desk",
      ];
      const normalized = normalizeFeatures(raw);
      expect(normalized).toEqual([
        "Wi-Fi Included",
        "Private Bathroom/CR",
        "Table/Desk",
      ]);
    });

    it("handles empty array cleanly", () => {
      expect(normalizeFeatures([])).toEqual([]);
    });
  });

  describe("featureToSlug", () => {
    it("converts feature names into clean URL slugs", () => {
      expect(featureToSlug("Wi-Fi Included")).toBe("wi-fi-included");
      expect(featureToSlug("Private Bathroom/CR")).toBe("private-bathroomcr");
      expect(featureToSlug("Has Parking")).toBe("has-parking");
    });
  });
});
