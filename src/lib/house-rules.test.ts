import { describe, it, expect } from "vitest";
import { parseHouseRules, formatHouseRules } from "./house-rules";

describe("house-rules helper", () => {
  describe("formatHouseRules", () => {
    it("returns empty string when both rules and notes are empty", () => {
      expect(formatHouseRules([], "")).toBe("");
      expect(formatHouseRules([], "   ")).toBe("");
    });

    it("formats rules only", () => {
      const result = formatHouseRules(["Cooking Allowed", "No Curfew"], "");
      expect(result).toBe("Cooking Allowed\nNo Curfew");
    });

    it("formats notes only under the Additional Notes header", () => {
      const result = formatHouseRules([], "pwede maka luto");
      expect(result).toBe("Additional Notes:\npwede maka luto");
    });

    it("formats both rules and notes with delimiter", () => {
      const result = formatHouseRules(
        ["Cooking Allowed", "No Curfew"],
        "pwede maka luto",
      );
      expect(result).toBe(
        "Cooking Allowed\nNo Curfew\n\nAdditional Notes:\npwede maka luto",
      );
    });
  });

  describe("parseHouseRules", () => {
    it("handles null, undefined, and empty string", () => {
      expect(parseHouseRules(null)).toEqual({ rules: [], notes: "" });
      expect(parseHouseRules(undefined)).toEqual({ rules: [], notes: "" });
      expect(parseHouseRules("")).toEqual({ rules: [], notes: "" });
      expect(parseHouseRules("   ")).toEqual({ rules: [], notes: "" });
    });

    it("parses string with Additional Notes delimiter", () => {
      const raw =
        "Cooking Allowed\nNo Curfew\n\nAdditional Notes:\npwede maka luto";
      expect(parseHouseRules(raw)).toEqual({
        rules: ["Cooking Allowed", "No Curfew"],
        notes: "pwede maka luto",
      });
    });

    it("parses notes-only string with Additional Notes header", () => {
      const raw = "Additional Notes:\nNo smoking allowed";
      expect(parseHouseRules(raw)).toEqual({
        rules: [],
        notes: "No smoking allowed",
      });
    });

    it("counts a line as a ticked rule only when the whole line is one of the five rules", () => {
      const raw = "Cooking Allowed\nVisitors Allowed";
      expect(parseHouseRules(raw)).toEqual({
        rules: ["Cooking Allowed", "Visitors Allowed"],
        notes: "",
      });
    });

    it("does not misread opposite or qualified free-text sentences as ticked rules", () => {
      const cases = [
        "No smoking allowed",
        "Strictly no pets allowed",
        "No visitors allowed after 9 PM",
        "Visitors allowed until 9 PM only, please clean up the kitchen after cooking...",
      ];

      for (const note of cases) {
        expect(parseHouseRules(note)).toEqual({
          rules: [],
          notes: note,
        });
        // Round-trip through formatHouseRules with no pills ticked
        const saved = formatHouseRules([], note);
        expect(parseHouseRules(saved)).toEqual({
          rules: [],
          notes: note,
        });
      }
    });

    it("parses purely custom notes without standard rules", () => {
      const raw = "Gate closes strictly at 10 PM. No loud noises.";
      const result = parseHouseRules(raw);
      expect(result.rules).toEqual([]);
      expect(result.notes).toBe(
        "Gate closes strictly at 10 PM. No loud noises.",
      );
    });

    it("keeps multiline custom rules in notes when none are exact standard rules", () => {
      const raw = "Gate closes at 10 PM\nNo loud parties allowed";
      const result = parseHouseRules(raw);
      expect(result.rules).toEqual([]);
      expect(result.notes).toBe(
        "Gate closes at 10 PM\nNo loud parties allowed",
      );
    });
  });
});
