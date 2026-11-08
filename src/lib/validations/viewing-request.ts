import { z } from "zod";

export const DECLINE_REASON_MAX_LENGTH = 500;

export const declineViewingSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(
      3,
      "Please provide a reason for declining the viewing (min 3 characters).",
    )
    .max(
      DECLINE_REASON_MAX_LENGTH,
      `Decline reason cannot exceed ${DECLINE_REASON_MAX_LENGTH} characters.`,
    ),
});

export type DeclineViewingInput = z.infer<typeof declineViewingSchema>;
