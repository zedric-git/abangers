import { describe, expect, it } from "vitest";
import { landlordProfileSchema } from "@/lib/validations/profile";
import {
  PH_MOBILE_DIGITS,
  toPhMobileDigits,
  toStoredPhMobileNumber,
} from "./ph-mobile-number";

describe("toPhMobileDigits (what the field shows after +63)", () => {
  it.each([
    // Typed the way the field asks: the 10 digits after +63.
    ["9171234567", "9171234567"],
    // The local form, the way people write it without +63.
    ["09171234567", "9171234567"],
    ["0917-123-4567", "9171234567"],
    ["0917 123 4567", "9171234567"],
    ["(0917) 123 4567", "9171234567"],
    // With the country code (paste, autofill).
    ["+63 917 123 4567", "9171234567"],
    ["+639171234567", "9171234567"],
    ["639171234567", "9171234567"],
    ["+63 0917 123 4567", "9171234567"],
    ["0063 917 123 4567", "9171234567"],
    // Letters and symbols never stay.
    ["abc", ""],
    ["9a1b7c", "917"],
    ["+*#(),;. -", ""],
    // Full-width digits are dropped, not converted.
    ["０９１７", ""],
  ])("%j -> %j", (input, shown) => {
    expect(toPhMobileDigits(input)).toBe(shown);
  });

  it("stops at 10 digits, so an 11th digit is ignored", () => {
    expect(PH_MOBILE_DIGITS).toBe(10);
    expect(toPhMobileDigits("9171234567" + "8")).toBe("9171234567");
    expect(toPhMobileDigits("91712345678901234")).toBe("9171234567");
  });

  it("treats a missing number as empty", () => {
    expect(toPhMobileDigits("")).toBe("");
    expect(toPhMobileDigits(null)).toBe("");
    expect(toPhMobileDigits(undefined)).toBe("");
  });

  it("ignores a 0 typed first, the way people start a number out of habit", () => {
    // The field calls it on every change with the whole new value.
    let shown = "";
    for (const key of "09171234567") {
      shown = toPhMobileDigits(shown + key);
    }
    expect(shown).toBe("9171234567");
  });

  it("only reads a leading 63 as the country code once there are more than 10 digits", () => {
    // While someone types, "63..." could still be the start of the number.
    expect(toPhMobileDigits("6391712345")).toBe("6391712345");
    expect(toPhMobileDigits("63917123456")).toBe("917123456");
  });
});

describe("toStoredPhMobileNumber (what the forms save)", () => {
  it('saves "0" + the 10 digits', () => {
    expect(toStoredPhMobileNumber("9171234567")).toBe("09171234567");
  });

  it("keeps an empty number empty", () => {
    expect(toStoredPhMobileNumber("")).toBe("");
  });

  it("gives a saved number back unchanged after loading it into the field", () => {
    expect(toStoredPhMobileNumber(toPhMobileDigits("09171234567"))).toBe(
      "09171234567",
    );
    expect(toStoredPhMobileNumber(toPhMobileDigits("09285550202"))).toBe(
      "09285550202",
    );
  });
});

// landlordProfileSchema checks the saved form (and the listings insert
// policy checks the same thing in SQL), so what the forms save for a full
// mobile number must pass, and anything else must not.
describe("what the forms save, checked by landlordProfileSchema", () => {
  const savedProfile = (typed: string) => ({
    full_name: "Maria Santos",
    contact_number: toStoredPhMobileNumber(toPhMobileDigits(typed)),
    facebook_url: "facebook.com/maria",
  });

  it.each(["917 123 4567", "0917-123-4567", "+63 917 123 4567"])(
    "accepts a full mobile number typed as %j",
    (typed) => {
      expect(landlordProfileSchema.safeParse(savedProfile(typed)).success).toBe(
        true,
      );
    },
  );

  it.each([
    ["", "nothing typed"],
    ["917 123 456", "only 9 digits"],
    ["817 123 4567", "doesn't start with 9"],
    ["+1 555 123 4567", "a US number, autofilled"],
  ])("refuses %j (%s)", (typed) => {
    expect(landlordProfileSchema.safeParse(savedProfile(typed)).success).toBe(
      false,
    );
  });
});
