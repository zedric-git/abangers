import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DECLINE_REASON_MAX_LENGTH,
  declineViewingSchema,
  MAX_ATTENDEES,
  MAX_DECLINE_REASON_LENGTH,
  MAX_MESSAGE_LENGTH,
  MIN_ATTENDEES,
  VIEWING_REQUEST_STATUSES,
  timeToSeconds,
  viewingRequestSchema,
} from "./viewing-request";

const validRequest = {
  listing_id: "a1b2c3d4-0000-4000-8000-000000000001",
  viewing_date: "2026-12-01",
  start_time: "10:00",
  end_time: "11:00",
  attendees: 2,
  message: "Can I bring my brother?",
};

describe("viewingRequestSchema", () => {
  it("accepts a valid request", () => {
    expect(viewingRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("accepts times the way Postgres sends them back (HH:MM:SS)", () => {
    const result = viewingRequestSchema.safeParse({
      ...validRequest,
      start_time: "10:00:00",
      end_time: "11:00:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a slot that ends when or before it starts", () => {
    for (const end_time of ["10:00", "10:00:00", "09:00"]) {
      const result = viewingRequestSchema.safeParse({
        ...validRequest,
        end_time,
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toEqual(["end_time"]);
    }
  });

  it("rejects times that aren't times of day", () => {
    for (const start_time of ["24:00", "9:00", "10:60", "10", ""]) {
      const result = viewingRequestSchema.safeParse({
        ...validRequest,
        start_time,
      });
      expect(result.success).toBe(false);
    }
  });

  it("needs 1 to 5 attendees, as a whole number", () => {
    for (const attendees of [MIN_ATTENDEES, MAX_ATTENDEES, "3"]) {
      const result = viewingRequestSchema.safeParse({
        ...validRequest,
        attendees,
      });
      expect(result.success).toBe(true);
    }
    for (const attendees of [MIN_ATTENDEES - 1, MAX_ATTENDEES + 1, 2.5, ""]) {
      const result = viewingRequestSchema.safeParse({
        ...validRequest,
        attendees,
      });
      expect(result.success).toBe(false);
    }
  });

  it("trims the message, and turns an empty one into null", () => {
    const parse = (message: unknown) =>
      viewingRequestSchema.parse({ ...validRequest, message }).message;
    expect(parse("  Can I bring my brother?  ")).toBe(
      "Can I bring my brother?",
    );
    expect(parse("   ")).toBeNull();
    expect(parse("")).toBeNull();
    expect(parse(null)).toBeNull();
    expect(parse(undefined)).toBeNull();
  });

  it("rejects a message over 500 characters", () => {
    const longest = viewingRequestSchema.safeParse({
      ...validRequest,
      message: "x".repeat(MAX_MESSAGE_LENGTH),
    });
    expect(longest.success).toBe(true);

    const tooLong = viewingRequestSchema.safeParse({
      ...validRequest,
      message: "x".repeat(MAX_MESSAGE_LENGTH + 1),
    });
    expect(tooLong.success).toBe(false);
  });

  it("rejects a listing id that isn't a UUID", () => {
    for (const listing_id of ["", "not-a-uuid", undefined]) {
      const result = viewingRequestSchema.safeParse({
        ...validRequest,
        listing_id,
      });
      expect(result.success).toBe(false);
    }
  });

  it("rejects a date that isn't a real YYYY-MM-DD date", () => {
    for (const viewing_date of ["2026-13-01", "2026-02-30", "12/01/2026", ""]) {
      const result = viewingRequestSchema.safeParse({
        ...validRequest,
        viewing_date,
      });
      expect(result.success).toBe(false);
    }
  });
});

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

describe("timeToSeconds", () => {
  it("counts from midnight, with or without seconds", () => {
    expect(timeToSeconds("10:00")).toBe(timeToSeconds("10:00:00"));
    expect(timeToSeconds("00:01:30")).toBe(90);
    expect(timeToSeconds("23:59")).toBe(23 * 3600 + 59 * 60);
  });
});

// The lists and limits in viewing-request.ts have to match the CHECK
// rules in the migration, or the form would accept a request the database
// refuses (or the other way round). If a later migration changes those
// rules, point this at it.
describe("matches 0017's CHECK rules", () => {
  const migration = readFileSync(
    new URL(
      "../../../supabase/migrations/0017_create_viewing_requests.sql",
      import.meta.url,
    ),
    "utf8",
  );

  /** The first group `pattern` matches in the migration. */
  function find(pattern: RegExp): string {
    const match = migration.match(pattern);
    if (!match) throw new Error(`Not in the migration: ${pattern}`);
    return match[1];
  }

  it("has the same statuses", () => {
    const list = find(
      /constraint status_is_known check \(\s*status in \(([^)]*)\)/,
    );
    const statuses = list.split(",").map((s) => s.trim().replace(/'/g, ""));
    expect(statuses).toEqual([...VIEWING_REQUEST_STATUSES]);
  });

  it("has the same number of attendees", () => {
    expect(Number(find(/attendees between (\d+) and \d+/))).toBe(MIN_ATTENDEES);
    expect(Number(find(/attendees between \d+ and (\d+)/))).toBe(MAX_ATTENDEES);
  });

  it("has the same length limits", () => {
    expect(Number(find(/char_length\(message\) <= (\d+)/))).toBe(
      MAX_MESSAGE_LENGTH,
    );
    expect(Number(find(/char_length\(decline_reason\) <= (\d+)/))).toBe(
      MAX_DECLINE_REASON_LENGTH,
    );
  });
});
