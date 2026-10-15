import type { Session, UserIdentity } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { classifySignUpResponse } from "./sign-up";

// Only presence matters to classifySignUpResponse, not the contents.
const session = {} as Session;
const identity = {} as UserIdentity;

describe("classifySignUpResponse", () => {
  // Supabase reports an already-registered email as a "successful"
  // signUp whose user has no identities — the modal used to miss this.
  it("treats an empty identities array as an already-registered email", () => {
    expect(classifySignUpResponse({ identities: [] }, null)).toBe(
      "already-registered",
    );
    expect(classifySignUpResponse({ identities: [] }, session)).toBe(
      "already-registered",
    );
  });

  it("errors when signUp returns no user", () => {
    expect(classifySignUpResponse(null, null)).toBe("no-user");
  });

  it("waits for email confirmation when there's no session", () => {
    expect(classifySignUpResponse({ identities: [identity] }, null)).toBe(
      "awaiting-confirmation",
    );
  });

  it("is signed in when there's a new user and a session", () => {
    expect(classifySignUpResponse({ identities: [identity] }, session)).toBe(
      "signed-in",
    );
    // A missing identities field isn't proof the email is taken.
    expect(classifySignUpResponse({}, session)).toBe("signed-in");
  });
});
