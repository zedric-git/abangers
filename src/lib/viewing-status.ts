export type ViewingStatus = "pending" | "confirmed" | "completed" | "declined";

/**
 * Validates whether a viewing request can legally transition from current to next status.
 *
 * Rules:
 * - Pending can transition to confirmed or declined.
 * - Confirmed can transition to completed (tour finished) or declined/cancelled.
 * - Completed and Declined are terminal states that cannot be transitioned from.
 */
export function canTransitionViewingStatus(
  current: ViewingStatus,
  next: ViewingStatus,
): boolean {
  if (current === next) return false;

  switch (current) {
    case "pending":
      return next === "confirmed" || next === "declined";
    case "confirmed":
      return next === "completed" || next === "declined";
    case "completed":
    case "declined":
      return false;
    default:
      return false;
  }
}

/**
 * Helper to determine if an appointment can be marked as completed by the landlord (#122).
 * Only confirmed appointments can be marked as completed.
 */
export function canMarkCompleted(status: ViewingStatus): boolean {
  return status === "confirmed";
}
