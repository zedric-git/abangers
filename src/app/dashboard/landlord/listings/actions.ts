"use server";

import { createClient } from "@/lib/supabase/server";
import { listingSchema, ListingInput } from "@/lib/validations/listing";

export type ActionResult<T = unknown> =
  { success: true; data: T } | { success: false; error: string };

/**
 * Server action to create a new property listing (S1-05.4).
 * Re-validates the form input against listingSchema server-side and
 * inserts the record with landlord_id set to the currently logged-in user.
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

    // 2. Validate input server-side with shared Zod schema
    const validatedData = listingSchema.parse(rawInput);

    // 3. Insert into Supabase listings table with landlord_id set to authenticated user ID
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
    const validatedData = listingSchema.parse(rawInput);

    // 3. Update listing record in Supabase
    const { data, error: updateError } = await supabase
      .from("listings")
      .update({
        ...validatedData,
      })
      .eq("id", id)
      .eq("landlord_id", user.id)
      .select("id")
      .single();

    if (updateError) {
      console.error("Database update error:", updateError);
      return {
        success: false,
        error: updateError.message || "Failed to update listing in database.",
      };
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
