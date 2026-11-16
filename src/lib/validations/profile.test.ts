import { describe, expect, it } from "vitest";
import {
  landlordProfileSchema,
  profileSetupSchema,
  renterProfileSchema,
} from "./profile";

// landlordProfileSchema is checked again in SQL by the listings insert
// policy (supabase/migrations/0012_require_ph_mobile_number_for_new_listings.sql).
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

  // A PH mobile number, saved as 09 + 9 digits (#225).
  it.each(["09171234567", "09051234567", "09998887777"])(
    "accepts the mobile number %j",
    (number) => {
      const result = landlordProfileSchema.safeParse({
        ...complete,
        contact_number: number,
      });
      expect(result.success).toBe(true);
    },
  );

  it.each([
    "",
    "0917123456", // 10 digits
    "091712345678", // 12 digits
    "08171234567", // 11 digits, but no 9 after the 0: not a mobile number
    "01234567890",
    "9171234567", // the 10 digits the form shows, without the 0
    "0917-123-4567",
    "0917123456a",
    " 09171234567",
    "+639171234567",
    "639171234567",
    "０９１７１２３４５６７", // full-width digits
  ])("rejects the contact number %j (must be 09 + 9 digits)", (number) => {
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

describe("renterProfileSchema (S2-01, #78, #82, #83)", () => {
  const validRenter = {
    full_name: "Ana Reyes",
    email: "renter1@abangers.test",
    gender: "Female" as const,
    contact_number: "09185550404",
    occupation_status: "Student" as const,
  };

  it("accepts a valid complete renter profile", () => {
    const result = renterProfileSchema.safeParse(validRenter);
    expect(result.success).toBe(true);
  });

  it("accepts minimal renter profile (optional phone and occupation omitted)", () => {
    const result = renterProfileSchema.safeParse({
      full_name: "Ana Reyes",
      email: "renter1@abangers.test",
      gender: "Female",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty strings for optional contact number and occupation", () => {
    const result = renterProfileSchema.safeParse({
      full_name: "Ana Reyes",
      email: "renter1@abangers.test",
      gender: "Female",
      contact_number: "",
      occupation_status: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.occupation_status).toBeUndefined();
    }
  });

  it("requires a full name", () => {
    const result = renterProfileSchema.safeParse({
      ...validRenter,
      full_name: "",
    });
    expect(result.success).toBe(false);
  });

  it("requires a valid email", () => {
    const result = renterProfileSchema.safeParse({
      ...validRenter,
      email: "invalid-email",
    });
    expect(result.success).toBe(false);
  });

  it.each(["Male", "Female", "Other", "Prefer not to say"] as const)(
    "accepts allowed gender: %s",
    (gender) => {
      const result = renterProfileSchema.safeParse({
        ...validRenter,
        gender,
      });
      expect(result.success).toBe(true);
    },
  );

  it("rejects an invalid gender", () => {
    const result = renterProfileSchema.safeParse({
      ...validRenter,
      gender: "Alien",
    });
    expect(result.success).toBe(false);
  });

  it.each(["Student", "Worker", "Student & Worker", "Other"] as const)(
    "accepts allowed occupation status: %s",
    (occupation_status) => {
      const result = renterProfileSchema.safeParse({
        ...validRenter,
        occupation_status,
      });
      expect(result.success).toBe(true);
    },
  );

  it("rejects an invalid occupation status", () => {
    const result = renterProfileSchema.safeParse({
      ...validRenter,
      occupation_status: "Astronaut",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid contact number when provided", () => {
    const result = renterProfileSchema.safeParse({
      ...validRenter,
      contact_number: "12345",
    });
    expect(result.success).toBe(false);
  });
});
