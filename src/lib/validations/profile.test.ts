import { describe, expect, it } from "vitest";
import { landlordProfileSchema, profileSetupSchema } from "./profile";

// landlordProfileSchema is checked again in SQL by the listings insert
// policy (supabase/migrations/0011_readable_listings_insert_policy.sql).
// These are the cases the two have to agree on: if a rule changes here,
// the policy needs a new migration too.

const complete = {
  full_name: "Maria Santos",
  contact_number: "09171234567",
  facebook_url: "facebook.com/maria",
};

describe("landlordProfileSchema", () => {
  it("accepts a complete profile", () => {
    expect(landlordProfileSchema.safeParse(complete).success).toBe(true);
  });

  it("needs a name", () => {
    const result = landlordProfileSchema.safeParse({
      ...complete,
      full_name: "",
    });
    expect(result.success).toBe(false);
  });

  it.each([
    "",
    "0917123456", // 10 digits
    "091712345678", // 12 digits
    "0917-123-4567",
    "0917123456a",
    " 09171234567",
    "+639171234567",
    "０９１７１２３４５６７", // full-width digits
  ])("rejects the contact number %j (must be exactly 11 digits)", (number) => {
    const result = landlordProfileSchema.safeParse({
      ...complete,
      contact_number: number,
    });
    expect(result.success).toBe(false);
  });

  it("needs at least one social media link", () => {
    const result = landlordProfileSchema.safeParse({
      ...complete,
      facebook_url: undefined,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["facebook_url"]);
  });

  // The policy's regex lists exactly the characters .trim() removes.
  // "\u00a0" is a no-break space and "\u3000" an ideographic space:
  // write them as escapes, because the characters themselves are invisible.
  it.each(["", "   ", "\t", "\r\n", "\u00a0", "\u3000"])(
    "counts a link of only %j as missing",
    (blank) => {
      const result = landlordProfileSchema.safeParse({
        ...complete,
        facebook_url: blank,
      });
      expect(result.success).toBe(false);
    },
  );

  it.each(["facebook_url", "instagram_url", "x_url"])(
    "accepts %s as the only link",
    (field) => {
      const result = landlordProfileSchema.safeParse({
        full_name: complete.full_name,
        contact_number: complete.contact_number,
        [field]: "@maria",
      });
      expect(result.success).toBe(true);
    },
  );
});

describe("profileSetupSchema (the profile forms)", () => {
  it("accepts a complete profile with the login email", () => {
    const result = profileSetupSchema.safeParse({
      ...complete,
      email: "maria@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("still needs a valid email", () => {
    const result = profileSetupSchema.safeParse({
      ...complete,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("keeps the complete-profile rules, including the social link", () => {
    const result = profileSetupSchema.safeParse({
      ...complete,
      email: "maria@example.com",
      facebook_url: undefined,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["facebook_url"]);
  });
});
