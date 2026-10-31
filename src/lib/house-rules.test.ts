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

    it("formats notes only", () => {
      const result = formatHouseRules([], "pwede maka luto");
      expect(result).toBe("pwede maka luto");
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

    it("parses legacy comma-separated string containing standard rules and custom text", () => {
      const raw =
        "Pets Allowed, No Curfew, Visitors Allowed, Cooking Allowed pwede maka luto";
      const result = parseHouseRules(raw);
      expect(result.rules).toEqual(
        expect.arrayContaining([
          "Cooking Allowed",
          "Visitors Allowed",
          "Pets Allowed",
          "No Curfew",
        ]),
      );
      expect(result.notes).toBe("pwede maka luto");
    });

    it("parses standard rules only without notes", () => {
      const raw = "Cooking Allowed, Visitors Allowed";
      const result = parseHouseRules(raw);
      expect(result.rules).toEqual(["Cooking Allowed", "Visitors Allowed"]);
      expect(result.notes).toBe("");
    });

    it("parses purely custom notes without standard rules", () => {
      const raw = "Gate closes strictly at 10 PM. No loud noises.";
      const result = parseHouseRules(raw);
      expect(result.rules).toEqual([]);
      expect(result.notes).toBe(
        "Gate closes strictly at 10 PM. No loud noises.",
      );
    });

    it("parses multiline custom rules without standard rules", () => {
      const raw = "Gate closes at 10 PM\nNo loud parties allowed";
      const result = parseHouseRules(raw);
      expect(result.rules).toEqual([
        "Gate closes at 10 PM",
        "No loud parties allowed",
      ]);
      expect(result.notes).toBe("");
    });
  });
});
