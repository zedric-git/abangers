import { z } from "zod";

/**
 * A renter's request to view a listing (S3-02, #77), saved in
 * public.viewing_requests (supabase/migrations/0017_create_viewing_requests.sql,
 * #107). The status list and the limits here are that migration's CHECK
 * rules: change them together, in a new migration.
 * viewing-request.test.ts compares them with the migration.
 *
 * viewingRequestSchema is what the renter fills in, used by both the
 * request form (#108) and the server action that saves it (#109), so they
 * check the same rules (AGENTS.md, rule 2). The landlord's decline
 * reason gets its schema here too (#110).
 */

/** Every status a request can have: 0017's status_is_known CHECK. */
export const VIEWING_REQUEST_STATUSES = [
  "pending",
  "confirmed",
  "declined",
  "cancelled",
  "completed",
] as const;

export const viewingRequestStatusSchema = z.enum(VIEWING_REQUEST_STATUSES);

export type ViewingRequestStatus = z.infer<typeof viewingRequestStatusSchema>;

/** How many people can come to one viewing: 0017's attendees_in_range CHECK. */
export const MIN_ATTENDEES = 1;
export const MAX_ATTENDEES = 5;

/** The longest renter's note: 0017's message_length CHECK. */
export const MAX_MESSAGE_LENGTH = 500;

/** The longest decline reason: 0017's decline_reason_only_when_declined CHECK. */
export const MAX_DECLINE_REASON_LENGTH = 500;

/**
 * A time of day: HH:MM, or HH:MM:SS, which is how Postgres sends a time
 * column back (e.g. "10:00:00").
 */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/** Seconds since midnight, so "10:00" and "10:00:00" compare as equal. */
export function timeToSeconds(time: string): number {
  const [hours, minutes, seconds = "0"] = time.split(":");
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

const timeSchema = z.string().regex(TIME_PATTERN, "Choose a time");

/**
 * What the renter sends. There's no renter_id, landlord_id or status:
 * the server action takes the renter from the session and the landlord
 * from the listing it loads (the generated insert type needs one, and
 * 0017's trigger replaces it anyway), and a new request is always
 * pending (0017). Whether the slot has started, and whether it's inside
 * the landlord's hours, need the clock and the landlord's availability,
 * so the database (0017) and #109's action check those.
 */
export const viewingRequestSchema = z
  .object({
    listing_id: z.uuid({ message: "Choose a listing" }),
    // A date as YYYY-MM-DD, like a Postgres date column.
    viewing_date: z.iso.date({ message: "Choose a date" }),
    start_time: timeSchema,
    end_time: timeSchema,
    attendees: z.coerce
      .number({ message: "Enter how many people are coming" })
      .int("Enter a whole number")
      .min(MIN_ATTENDEES, `At least ${MIN_ATTENDEES} person has to come`)
      .max(MAX_ATTENDEES, `At most ${MAX_ATTENDEES} people can come`),
    // Optional. Trimmed, and an empty note becomes null, since 0017
    // stores "no note" as null, never as "".
    message: z
      .string()
      .trim()
      .max(MAX_MESSAGE_LENGTH, `Use at most ${MAX_MESSAGE_LENGTH} characters`)
      .nullish()
      .transform((note) => note || null),
  })
  .refine(
    (request) =>
      timeToSeconds(request.end_time) > timeToSeconds(request.start_time),
    { message: "The viewing has to end after it starts", path: ["end_time"] },
  );

export type ViewingRequestInput = z.infer<typeof viewingRequestSchema>;
