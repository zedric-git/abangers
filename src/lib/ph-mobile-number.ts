/**
 * Philippine mobile numbers in the landlord profile forms (#225).
 *
 * A PH mobile number is +63 followed by 10 digits that start with 9
 * (+63 917 123 4567). The profile forms show a fixed "+63" and let the
 * landlord type only the 10 digits after it (PhMobileNumberInput). The
 * database keeps the local form the forms saved before that: a 0, then the
 * same 10 digits (09171234567). That stored form is what
 * landlordProfileSchema and the listings insert policy (0012) check.
 *
 *   typed, pasted or autofilled   the field shows   saved as
 *   0917 123 4567                 9171234567        09171234567
 *   +63 917 123 4567              9171234567        09171234567
 */

/** How many digits come after +63. */
export const PH_MOBILE_DIGITS = 10;

/**
 * The digits to show after "+63", from whatever was typed, pasted or
 * autofilled into the field, or from a saved number:
 * - anything that isn't 0-9 goes: letters, spaces, "+", "-", "(", ...
 *   (\D also drops full-width digits like "０", rather than converting them);
 * - leading 0s go: "0917..." is how people write the number without +63,
 *   and the 0 is what +63 replaces;
 * - a 63 country code in front of a full number goes ("+63 917 123 4567",
 *   "639171234567", "+63 0917 123 4567");
 * - it stops at 10 digits, so an 11th digit is ignored.
 */
export function toPhMobileDigits(value: string | null | undefined): string {
  let digits = (value ?? "").replace(/\D/g, "").replace(/^0+/, "");

  // Only a number that's too long can be read as starting with the
  // country code. While someone types digit by digit, a 63 at the start
  // could still be the start of the 10 digits.
  if (digits.length > PH_MOBILE_DIGITS && digits.startsWith("63")) {
    digits = digits.slice(2).replace(/^0+/, "");
  }

  return digits.slice(0, PH_MOBILE_DIGITS);
}

/**
 * What the profile forms save for the digits after +63 (what
 * toPhMobileDigits returned): "0" + the digits, so "9171234567" is saved
 * as "09171234567". Empty stays empty, so the schema reports a missing
 * number, not a wrong one.
 */
export function toStoredPhMobileNumber(digits: string): string {
  return digits === "" ? "" : `0${digits}`;
}
