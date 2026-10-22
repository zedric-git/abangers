"use server";

import { createClient } from "@/lib/supabase/server";
import {
  availabilityStatusSchema,
  listingSchema,
  ListingInput,
} from "@/lib/validations/listing";
import {
  CANNOT_CREATE_LISTINGS_MESSAGE,
  checkCanCreateListings,
  isFixedOnProfilePage,
} from "@/lib/auth/can-create-listings";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      // Set by createListingAction when the landlord fixes this on their
      // Profile page (complete the profile, or verify the account), so the
      // listing form's error card can link there (#221).
      fixOnProfilePage?: boolean;
    };

// Shown when an update, status change or delete matched no row: the
// listing was deleted (e.g. in another tab) or belongs to someone else
// (#231). RLS and the landlord_id filter make those look the same.
const LISTING_NOT_FOUND_MESSAGE =
  "This listing no longer exists, or it isn't yours. Go back to your listings and refresh the page.";

// Shown if the schema somehow fails without a message of its own.
const INVALID_LISTING_MESSAGE = "Please fill in all required fields correctly.";

/**
 * Server action to create a new property listing (S1-05.4).
 * Checks the landlord may post (complete profile + approved verification,
 * S1-15.3), re-validates the form input against listingSchema server-side,
 * and inserts the record with landlord_id set to the currently logged-in user.
 */
export async function createListingAction(
  rawInput: ListingInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Unauthorized. You must be logged in to create a listing.",
      };
    }

    // 2. Only landlords with a complete profile and an approved
    //    verification can post (S1-15.3). The database enforces this too
    //    (listings insert policy, migration 0012), but it only answers
    //    "permission denied"; checking first tells the landlord which step
    //    is missing.
    const permission = await checkCanCreateListings(supabase, user.id);
    if (!permission.ok) {
      return {
        success: false,
        error: permission.message,
        fixOnProfilePage: isFixedOnProfilePage(permission.reason),
      };
    }

    // 3. Validate input server-side with shared Zod schema
    //    safeParse, not parse: parse throws, and the catch below would
    //    show Zod's raw JSON. The first issue's message is a sentence the
    //    landlord can act on, as in the profile forms (#231).
    const validation = listingSchema.safeParse(rawInput);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || INVALID_LISTING_MESSAGE,
      };
    }
    const validatedData = validation.data;
    if (validatedData.available_rooms <= 0) {
      validatedData.availability_status = "fully_occupied";
    }

    // 4. Insert into Supabase listings table with landlord_id set to authenticated user ID
    const { data, error: insertError } = await supabase
      .from("listings")
      .insert({
        ...validatedData,
        landlord_id: user.id,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      // 42501 = the insert policy refused it. Step 2 normally catches that
      // first, so something changed in between (e.g. the profile was edited
      // in another tab); still show a message the landlord can act on.
      if (insertError.code === "42501") {
        return {
          success: false,
          error: CANNOT_CREATE_LISTINGS_MESSAGE,
          // The message sends them to the Profile page.
          fixOnProfilePage: true,
        };
      }
      return {
        success: false,
        error: insertError.message || "Failed to create listing in database.",
      };
    }

    return {
      success: true,
      data: { id: data.id },
    };
  } catch (err) {
    console.error("createListingAction error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Server action to update an existing property listing.
 * Re-validates input server-side and updates the database record.
 * RLS ensures landlords can only update their own listings.
 */
export async function updateListingAction(
  id: string,
  rawInput: ListingInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Unauthorized. You must be logged in to update a listing.",
      };
    }

    // 2. Validate input server-side
    //    safeParse, not parse: parse throws, and the catch below would
    //    show Zod's raw JSON. The first issue's message is a sentence the
    //    landlord can act on, as in the profile forms (#231).
    const validation = listingSchema.safeParse(rawInput);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || INVALID_LISTING_MESSAGE,
      };
    }
    const validatedData = validation.data;
    if (validatedData.available_rooms <= 0) {
      validatedData.availability_status = "fully_occupied";
    }

    // 3. Update listing record in Supabase
    const { data, error: updateError } = await supabase
      .from("listings")
      .update({
        ...validatedData,
      })
      .eq("id", id)
      .eq("landlord_id", user.id)
      .select("id")
      // maybeSingle, not single: no row back means the listing is gone or
      // isn't theirs, and single would turn that into PostgREST's raw
      // "JSON object requested, multiple (or no) rows returned".
      .maybeSingle();

    if (updateError) {
      console.error("Database update error:", updateError);
      return {
        success: false,
        error: updateError.message || "Failed to update listing in database.",
      };
    }

    if (!data) {
      return { success: false, error: LISTING_NOT_FOUND_MESSAGE };
    }

    return {
      success: true,
      data: { id: data.id },
    };
  } catch (err) {
    console.error("updateListingAction error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Server action to delete an existing property listing (S1-11.2).
 * Authenticates user and deletes the record from Supabase listings table.
 * RLS ensures landlords can only delete their own listings.
 */
export async function deleteListingAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Unauthorized. You must be logged in to delete a listing.",
      };
    }

    // 2. Delete listing from Supabase scoped to authenticated landlord_id
    //    .select("id") returns the deleted rows, so we can tell whether
    //    anything was actually deleted.
    const { data: deletedRows, error: deleteError } = await supabase
      .from("listings")
      .delete()
      .eq("id", id)
      .eq("landlord_id", user.id)
      .select("id");

    if (deleteError) {
      console.error("Database delete error:", deleteError);
      return {
        success: false,
        error: deleteError.message || "Failed to delete listing from database.",
      };
    }

    // Nothing deleted: it was already gone, or it isn't theirs. Saying
    // "deleted" here would be wrong (#231).
    if (deletedRows.length === 0) {
      return { success: false, error: LISTING_NOT_FOUND_MESSAGE };
    }

    return {
      success: true,
      data: { id },
    };
  } catch (err) {
    console.error("deleteListingAction error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Server action for 1-click status toggle (S1-12.1).
 * Updates availability_status column without full form re-edit.
 * RLS ensures landlords can only update their own listings.
 */
export async function updateListingStatusAction(
  id: string,
  newStatus: string,
): Promise<ActionResult<{ id: string; availability_status: string }>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Unauthorized. You must be logged in to update listing status.",
      };
    }

    // 2. Validate the status against the same list as the listing schema
    //    and the database's CHECK constraint. newStatus stays a plain
    //    string: a server action can be called with anything, so this
    //    runtime check is what actually keeps bad values out (#231).
    const status = availabilityStatusSchema.safeParse(newStatus);
    if (!status.success) {
      return {
        success: false,
        error:
          "That status isn't one we know. Choose Available, Almost Full or Fully Occupied.",
      };
    }

    // 3. Update status column in Supabase
    const { data, error: updateError } = await supabase
      .from("listings")
      .update({ availability_status: status.data })
      .eq("id", id)
      .eq("landlord_id", user.id)
      .select("id, availability_status")
      // No row back means the listing is gone or isn't theirs (see
      // updateListingAction).
      .maybeSingle();

    if (updateError) {
      console.error("Status update error:", updateError);
      return {
        success: false,
        error: updateError.message || "Failed to update status in database.",
      };
    }

    if (!data) {
      return { success: false, error: LISTING_NOT_FOUND_MESSAGE };
    }

    return {
      success: true,
      data: {
        id: data.id,
        availability_status: data.availability_status,
      },
    };
  } catch (err) {
    console.error("updateListingStatusAction error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
