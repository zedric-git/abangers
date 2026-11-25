export type VisitStatus =
  "pending" | "confirmed" | "completed" | "declined" | "cancelled";

/**
 * Validates whether a visit request can legally transition from current to next status.
 *
 * Rules:
 * - Pending can transition to confirmed, declined, or cancelled.
 * - Confirmed can transition to completed (tour finished), declined, or cancelled.
 * - Completed, Declined, and Cancelled are terminal states that cannot be transitioned from.
 */
export function canTransitionVisitStatus(
  current: VisitStatus,
  next: VisitStatus,
): boolean {
  if (current === next) return false;

  switch (current) {
    case "pending":
      return (
        next === "confirmed" || next === "declined" || next === "cancelled"
      );
    case "confirmed":
      return (
        next === "completed" || next === "declined" || next === "cancelled"
      );
    case "completed":
    case "declined":
    case "cancelled":
      return false;
    default:
      return false;
  }
}

/**
 * Helper to determine if an appointment can be marked as completed by the landlord (#122, #27).
 * Requirements:
 * 1. Must be in 'confirmed' status.
 * 2. If visitDate is provided, the appointment date must be today or in the past (per #27: "after it happens").
 */
export function canMarkCompleted(
  status: VisitStatus,
  visitDate?: string | Date,
  referenceDate?: string | Date,
): boolean {
  if (status !== "confirmed") return false;
  if (!visitDate) return true;

  const vDate = new Date(visitDate);
  if (isNaN(vDate.getTime())) return false;

  const refDate = referenceDate ? new Date(referenceDate) : new Date();

  // Normalize to UTC day boundary for reliable calendar date comparison
  const vDay = Date.UTC(
    vDate.getUTCFullYear(),
    vDate.getUTCMonth(),
    vDate.getUTCDate(),
  );
  const refDay = Date.UTC(
    refDate.getUTCFullYear(),
    refDate.getUTCMonth(),
    refDate.getUTCDate(),
  );

  return vDay <= refDay;
}
