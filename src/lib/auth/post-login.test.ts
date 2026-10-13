import { describe, expect, it } from "vitest";
import { decidePostLoginRoute } from "./post-login";

describe("decidePostLoginRoute", () => {
  it("uses the profiles row when it exists", () => {
    expect(decidePostLoginRoute("landlord", undefined)).toEqual({
      kind: "dashboard",
      role: "landlord",
    });
    expect(decidePostLoginRoute("renter", "landlord")).toEqual({
      kind: "dashboard",
      role: "renter",
    });
  });

  it("errors on an unknown role in the profiles row instead of guessing", () => {
    expect(decidePostLoginRoute("admin", "landlord")).toEqual({
      kind: "error",
    });
  });

  // #170: a missing profiles row used to fall through to the renter dashboard.
  it("recreates a missing profile from the role saved at sign-up", () => {
    expect(decidePostLoginRoute(undefined, "landlord")).toEqual({
      kind: "recreate-profile",
      role: "landlord",
    });
    expect(decidePostLoginRoute(undefined, "renter")).toEqual({
      kind: "recreate-profile",
      role: "renter",
    });
  });

  it("errors when there's no profile and no saved role", () => {
    expect(decidePostLoginRoute(undefined, undefined)).toEqual({
      kind: "error",
    });
    expect(decidePostLoginRoute(undefined, "")).toEqual({ kind: "error" });
  });
});
