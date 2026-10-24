"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  cannotReview,
  reviewVerification,
  type ReviewVerificationResult,
} from "@/lib/auth/review-verification";
import { ADMIN_DASHBOARD_PATH } from "@/lib/admin-review-view";
import type { VerificationReviewInput } from "@/lib/validations/verification";

/**
 * Server action for the review page's Approve and Reject (S2-11.2, #256).
 * Anyone can call a server action with anything, so this checks who's
 * signed in, and reviewVerification checks they're an admin and validates
 * the decision again before saving. The database enforces all of it anyway
 * (0014): this is so the admin gets a clear message.
 *
 * It only answers with what the dialog shows (ok, or the reason and
 * message), never the database row.
 */
export async function reviewVerificationAction(
  input: VerificationReviewInput,
): Promise<ReviewVerificationResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return cannotReview("not_signed_in");
    }

    const result = await reviewVerification(supabase, user.id, input);

    // The list drops the submission now that it's reviewed.
    if (result.ok) {
      revalidatePath(ADMIN_DASHBOARD_PATH);
    }
    return result;
  } catch (err) {
    console.error("reviewVerificationAction error:", err);
    return cannotReview("save_failed");
  }
}
