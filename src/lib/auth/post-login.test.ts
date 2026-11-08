import { describe, expect, it } from "vitest";
import { decidePostLoginRoute, pathForRole } from "./post-login";

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

  it("sends an admin to the admin dashboard (#256)", () => {
    expect(decidePostLoginRoute("admin", undefined)).toEqual({
      kind: "dashboard",
      role: "admin",
    });
  });

  it("errors on an unknown role in the profiles row instead of guessing", () => {
    expect(decidePostLoginRoute("superuser", "landlord")).toEqual({
      kind: "error",
    });
  });

  // Users can change their own auth metadata, and an admin is made with
  // SQL only (0014), so a saved "admin" never recreates a profile.
  it("never recreates an admin profile from the saved role", () => {
    expect(decidePostLoginRoute(undefined, "admin")).toEqual({
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

describe("pathForRole (S2-01)", () => {
  it("sends incomplete renters to /renter/profile-setup", () => {
    expect(pathForRole("renter", false)).toBe("/renter/profile-setup");
    expect(pathForRole("renter", undefined)).toBe("/renter/profile-setup");
  });

  it("sends complete renters to /dashboard/renter", () => {
    expect(pathForRole("renter", true)).toBe("/dashboard/renter");
  });

  it("sends landlords and admins to their dashboards", () => {
    expect(pathForRole("landlord", false)).toBe("/dashboard/landlord");
    expect(pathForRole("landlord", true)).toBe("/dashboard/landlord");
    expect(pathForRole("admin", false)).toBe("/dashboard/admin");
  });
});
