import { describe, expect, it } from "vitest";
import {
  canMarkCompleted,
  canTransitionViewingStatus,
  type ViewingStatus,
} from "./viewing-status";

describe("canTransitionViewingStatus", () => {
  it("allows pending to transition to confirmed or declined", () => {
    expect(canTransitionViewingStatus("pending", "confirmed")).toBe(true);
    expect(canTransitionViewingStatus("pending", "declined")).toBe(true);
    expect(canTransitionViewingStatus("pending", "completed")).toBe(false);
    expect(canTransitionViewingStatus("pending", "pending")).toBe(false);
  });

  it("allows confirmed to transition to completed or declined", () => {
    expect(canTransitionViewingStatus("confirmed", "completed")).toBe(true);
    expect(canTransitionViewingStatus("confirmed", "declined")).toBe(true);
    expect(canTransitionViewingStatus("confirmed", "pending")).toBe(false);
    expect(canTransitionViewingStatus("confirmed", "confirmed")).toBe(false);
  });

  it("blocks any transition from completed (terminal state)", () => {
    const targets: ViewingStatus[] = [
      "pending",
      "confirmed",
      "completed",
      "declined",
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
    ];
    for (const target of targets) {
      expect(canTransitionViewingStatus("declined", target)).toBe(false);
    }
  });
});

describe("canMarkCompleted", () => {
  it("only allows confirmed viewings to be marked as completed", () => {
    expect(canMarkCompleted("confirmed")).toBe(true);
    expect(canMarkCompleted("pending")).toBe(false);
    expect(canMarkCompleted("completed")).toBe(false);
    expect(canMarkCompleted("declined")).toBe(false);
  });
});
