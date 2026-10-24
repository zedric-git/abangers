import { describe, expect, it } from "vitest";
import { guardRedirect, isGuardedPath } from "./route-guard";

describe("isGuardedPath", () => {
  it("guards the dashboards and profile setup", () => {
    expect(isGuardedPath("/dashboard")).toBe(true);
    expect(isGuardedPath("/dashboard/landlord")).toBe(true);
    expect(isGuardedPath("/dashboard/renter/saved")).toBe(true);
    expect(isGuardedPath("/profile-setup")).toBe(true);
  });

  it("leaves other pages alone", () => {
    expect(isGuardedPath("/")).toBe(false);
    expect(isGuardedPath("/listings/123")).toBe(false);
    // Only whole path segments count.
    expect(isGuardedPath("/dashboards")).toBe(false);
    expect(isGuardedPath("/profile-setup-help")).toBe(false);
  });
});

describe("guardRedirect", () => {
  describe("/profile-setup (#233)", () => {
    it("sends a signed-out visitor to the home page", () => {
      expect(guardRedirect("/profile-setup", false, null)).toBe("/");
    });

    it("sends a renter to their own dashboard", () => {
      expect(guardRedirect("/profile-setup", true, "/dashboard/renter")).toBe(
        "/dashboard/renter",
      );
    });

    it("lets a landlord in", () => {
      expect(
        guardRedirect("/profile-setup", true, "/dashboard/landlord"),
      ).toBeNull();
    });

    it("lets in a landlord whose profile row was just recreated", () => {
      expect(
        guardRedirect("/profile-setup", true, "/profile-setup"),
      ).toBeNull();
    });

    it("sends a user with no usable role to the home page", () => {
      expect(guardRedirect("/profile-setup", true, null)).toBe("/");
    });
  });

  describe("/dashboard/*", () => {
    it("sends a signed-out visitor to the home page", () => {
      expect(guardRedirect("/dashboard/landlord", false, null)).toBe("/");
    });

    it("lets a user into their own dashboard and the pages under it", () => {
      expect(
        guardRedirect("/dashboard/landlord", true, "/dashboard/landlord"),
      ).toBeNull();
      expect(
        guardRedirect(
          "/dashboard/landlord/listings/new",
          true,
          "/dashboard/landlord",
        ),
      ).toBeNull();
      expect(
        guardRedirect("/dashboard/renter", true, "/dashboard/renter"),
      ).toBeNull();
    });

    it("sends a user from the other role's dashboard to their own", () => {
      expect(
        guardRedirect("/dashboard/landlord", true, "/dashboard/renter"),
      ).toBe("/dashboard/renter");
      expect(
        guardRedirect("/dashboard/renter/saved", true, "/dashboard/landlord"),
      ).toBe("/dashboard/landlord");
    });

    it("sends a user from /dashboard itself to their own dashboard", () => {
      expect(guardRedirect("/dashboard", true, "/dashboard/renter")).toBe(
        "/dashboard/renter",
      );
    });

    it("sends a landlord whose profile row was just recreated to profile setup", () => {
      expect(guardRedirect("/dashboard/landlord", true, "/profile-setup")).toBe(
        "/profile-setup",
      );
    });

    it("sends a user with no usable role to the home page", () => {
      expect(guardRedirect("/dashboard/renter", true, null)).toBe("/");
    });
  });

  describe("the admin dashboard (#256)", () => {
    it("lets an admin into it and the pages under it", () => {
      expect(
        guardRedirect("/dashboard/admin", true, "/dashboard/admin"),
      ).toBeNull();
      expect(
        guardRedirect(
          "/dashboard/admin/verifications/abc",
          true,
          "/dashboard/admin",
        ),
      ).toBeNull();
    });

    it("sends landlords and renters back to their own dashboard", () => {
      expect(
        guardRedirect("/dashboard/admin", true, "/dashboard/landlord"),
      ).toBe("/dashboard/landlord");
      expect(
        guardRedirect(
          "/dashboard/admin/verifications/abc",
          true,
          "/dashboard/renter",
        ),
      ).toBe("/dashboard/renter");
    });

    it("sends a signed-out visitor to the home page", () => {
      expect(guardRedirect("/dashboard/admin", false, null)).toBe("/");
    });

    it("sends an admin from the other dashboards and profile setup to theirs", () => {
      expect(
        guardRedirect("/dashboard/landlord", true, "/dashboard/admin"),
      ).toBe("/dashboard/admin");
      expect(guardRedirect("/dashboard/renter", true, "/dashboard/admin")).toBe(
        "/dashboard/admin",
      );
      expect(guardRedirect("/profile-setup", true, "/dashboard/admin")).toBe(
        "/dashboard/admin",
      );
    });
  });
});
