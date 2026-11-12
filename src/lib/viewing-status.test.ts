import { describe, expect, it } from "vitest";
import {
  canMarkCompleted,
  canTransitionViewingStatus,
  type ViewingStatus,
} from "./viewing-status";

describe("canTransitionViewingStatus", () => {
  it("allows pending to transition to confirmed, declined, or cancelled", () => {
    expect(canTransitionViewingStatus("pending", "confirmed")).toBe(true);
    expect(canTransitionViewingStatus("pending", "declined")).toBe(true);
    expect(canTransitionViewingStatus("pending", "cancelled")).toBe(true);
    expect(canTransitionViewingStatus("pending", "completed")).toBe(false);
    expect(canTransitionViewingStatus("pending", "pending")).toBe(false);
  });

  it("allows confirmed to transition to completed, declined, or cancelled", () => {
    expect(canTransitionViewingStatus("confirmed", "completed")).toBe(true);
    expect(canTransitionViewingStatus("confirmed", "declined")).toBe(true);
    expect(canTransitionViewingStatus("confirmed", "cancelled")).toBe(true);
    expect(canTransitionViewingStatus("confirmed", "pending")).toBe(false);
    expect(canTransitionViewingStatus("confirmed", "confirmed")).toBe(false);
  });

  it("blocks any transition from completed (terminal state)", () => {
    const targets: ViewingStatus[] = [
      "pending",
      "confirmed",
      "completed",
      "declined",
      "cancelled",
    ];
    for (const target of targets) {
      expect(canTransitionViewingStatus("completed", target)).toBe(false);
    }
  });

  it("blocks any transition from declined (terminal state)", () => {
    const targets: ViewingStatus[] = [
      "pending",
      "confirmed",
      "completed",
      "declined",
      "cancelled",
    ];
    for (const target of targets) {
      expect(canTransitionViewingStatus("declined", target)).toBe(false);
    }
  });

  it("blocks any transition from cancelled (terminal state)", () => {
    const targets: ViewingStatus[] = [
      "pending",
      "confirmed",
      "completed",
      "declined",
      "cancelled",
    ];
    for (const target of targets) {
      expect(canTransitionViewingStatus("cancelled", target)).toBe(false);
    }
  });
});

describe("canMarkCompleted", () => {
  it("only allows confirmed viewings to be marked as completed", () => {
    expect(canMarkCompleted("confirmed")).toBe(true);
    expect(canMarkCompleted("pending")).toBe(false);
    expect(canMarkCompleted("completed")).toBe(false);
    expect(canMarkCompleted("declined")).toBe(false);
    expect(canMarkCompleted("cancelled")).toBe(false);
  });

  it("respects viewing date check (#27: after it happens)", () => {
    const today = "2026-10-20T10:00:00Z";
    const pastDate = "2026-10-18T14:00:00Z";
    const sameDay = "2026-10-20T16:00:00Z";
    const futureDate = "2026-10-22T09:00:00Z";

    expect(canMarkCompleted("confirmed", pastDate, today)).toBe(true);
    expect(canMarkCompleted("confirmed", sameDay, today)).toBe(true);
    expect(canMarkCompleted("confirmed", futureDate, today)).toBe(false);
    expect(canMarkCompleted("pending", pastDate, today)).toBe(false);
  });
});
