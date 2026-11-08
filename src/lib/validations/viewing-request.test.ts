import { describe, expect, it } from "vitest";
import {
  DECLINE_REASON_MAX_LENGTH,
  declineViewingSchema,
} from "./viewing-request";

describe("declineViewingSchema", () => {
  it("accepts valid decline reasons", () => {
    const result = declineViewingSchema.safeParse({
      reason:
        "The requested time slot conflicts with scheduled building maintenance.",
    });
    expect(result.success).toBe(true);
  });

  it("trims whitespace from reasons", () => {
    const result = declineViewingSchema.safeParse({
      reason: "   Slot no longer available.   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe("Slot no longer available.");
    }
  });

  it("rejects reasons shorter than 3 characters", () => {
    const result = declineViewingSchema.safeParse({
      reason: "No",
    });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only reasons", () => {
    const result = declineViewingSchema.safeParse({
      reason: "    ",
    });
    expect(result.success).toBe(false);
  });

  it(`rejects reasons exceeding ${DECLINE_REASON_MAX_LENGTH} characters`, () => {
    const tooLong = "A".repeat(DECLINE_REASON_MAX_LENGTH + 1);
    const result = declineViewingSchema.safeParse({
      reason: tooLong,
    });
    expect(result.success).toBe(false);
  });
});
