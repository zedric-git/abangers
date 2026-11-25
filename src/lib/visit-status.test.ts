import { describe, expect, it } from "vitest";
import {
  canMarkCompleted,
  canTransitionVisitStatus,
  type VisitStatus,
} from "./visit-status";

describe("canTransitionVisitStatus", () => {
  it("allows pending to transition to confirmed, declined, or cancelled", () => {
    expect(canTransitionVisitStatus("pending", "confirmed")).toBe(true);
    expect(canTransitionVisitStatus("pending", "declined")).toBe(true);
    expect(canTransitionVisitStatus("pending", "cancelled")).toBe(true);
    expect(canTransitionVisitStatus("pending", "completed")).toBe(false);
    expect(canTransitionVisitStatus("pending", "pending")).toBe(false);
  });

  it("allows confirmed to transition to completed, declined, or cancelled", () => {
    expect(canTransitionVisitStatus("confirmed", "completed")).toBe(true);
    expect(canTransitionVisitStatus("confirmed", "declined")).toBe(true);
    expect(canTransitionVisitStatus("confirmed", "cancelled")).toBe(true);
    expect(canTransitionVisitStatus("confirmed", "pending")).toBe(false);
    expect(canTransitionVisitStatus("confirmed", "confirmed")).toBe(false);
  });

  it("blocks any transition from completed (terminal state)", () => {
    const targets: VisitStatus[] = [
      "pending",
      "confirmed",
      "completed",
      "declined",
      "cancelled",
    ];
    for (const target of targets) {
      expect(canTransitionVisitStatus("completed", target)).toBe(false);
    }
  });

  it("blocks any transition from declined (terminal state)", () => {
    const targets: VisitStatus[] = [
      "pending",
      "confirmed",
      "completed",
      "declined",
      "cancelled",
    ];
    for (const target of targets) {
      expect(canTransitionVisitStatus("declined", target)).toBe(false);
    }
  });

  it("blocks any transition from cancelled (terminal state)", () => {
    const targets: VisitStatus[] = [
      "pending",
      "confirmed",
      "completed",
      "declined",
      "cancelled",
    ];
    for (const target of targets) {
      expect(canTransitionVisitStatus("cancelled", target)).toBe(false);
    }
  });
});

describe("canMarkCompleted", () => {
  it("only allows confirmed visits to be marked as completed", () => {
    expect(canMarkCompleted("confirmed")).toBe(true);
    expect(canMarkCompleted("pending")).toBe(false);
    expect(canMarkCompleted("completed")).toBe(false);
    expect(canMarkCompleted("declined")).toBe(false);
    expect(canMarkCompleted("cancelled")).toBe(false);
  });

  it("respects visit date check (#27: after it happens)", () => {
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
