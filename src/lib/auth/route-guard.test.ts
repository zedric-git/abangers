import { describe, expect, it } from "vitest";
import { guardRedirect, isGuardedPath } from "./route-guard";

describe("isGuardedPath", () => {
  it("guards the dashboards, profile setup, and listing detail pages", () => {
    expect(isGuardedPath("/dashboard")).toBe(true);
    expect(isGuardedPath("/dashboard/landlord")).toBe(true);
    expect(isGuardedPath("/dashboard/renter/saved")).toBe(true);
    expect(isGuardedPath("/profile-setup")).toBe(true);
    expect(isGuardedPath("/renter/profile-setup")).toBe(true);
    expect(isGuardedPath("/listings/123")).toBe(true);
  });

  it("leaves public pages alone", () => {
    expect(isGuardedPath("/")).toBe(false);
    expect(isGuardedPath("/listings")).toBe(false);
    // Only whole path segments count.
    expect(isGuardedPath("/dashboards")).toBe(false);
    expect(isGuardedPath("/profile-setup-help")).toBe(false);
    expect(isGuardedPath("/renter/profile-setup-help")).toBe(false);
    expect(isGuardedPath("/listings-help")).toBe(false);
  });
});

describe("guardRedirect", () => {
  describe("public pages (#85)", () => {
    it("never redirects unauthenticated guests on /listings", () => {
      expect(guardRedirect("/listings", false, null)).toBeNull();
      expect(guardRedirect("/", false, null)).toBeNull();
    });

    it("never redirects authenticated users on /listings", () => {
      expect(guardRedirect("/listings", true, "/dashboard/renter")).toBeNull();
    });
  });
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

  describe("/listings/<id> (#93)", () => {
    it("sends a signed-out visitor to the home page", () => {
      expect(guardRedirect("/listings/123", false, null)).toBe("/");
    });

    it("lets any signed-in user with a valid role view the listing details", () => {
      expect(
        guardRedirect("/listings/123", true, "/dashboard/renter"),
      ).toBeNull();
      expect(
        guardRedirect("/listings/123", true, "/dashboard/landlord"),
      ).toBeNull();
      expect(
        guardRedirect("/listings/123", true, "/dashboard/admin"),
      ).toBeNull();
      expect(guardRedirect("/listings/123", true, "/profile-setup")).toBeNull();
    });

    it("sends a user with no usable role to the home page", () => {
      expect(guardRedirect("/listings/123", true, null)).toBe("/");
    });
  });

  describe("/renter/profile-setup (S2-01)", () => {
    it("sends a signed-out visitor to the home page", () => {
      expect(guardRedirect("/renter/profile-setup", false, null)).toBe("/");
    });

    it("lets in an incomplete renter", () => {
      expect(
        guardRedirect("/renter/profile-setup", true, "/renter/profile-setup"),
      ).toBeNull();
    });

    it("sends a complete renter to their dashboard", () => {
      expect(
        guardRedirect("/renter/profile-setup", true, "/dashboard/renter"),
      ).toBe("/dashboard/renter");
    });

    it("sends a landlord to the landlord dashboard", () => {
      expect(
        guardRedirect("/renter/profile-setup", true, "/dashboard/landlord"),
      ).toBe("/dashboard/landlord");
    });

    it("sends an admin to the admin dashboard", () => {
      expect(
        guardRedirect("/renter/profile-setup", true, "/dashboard/admin"),
      ).toBe("/dashboard/admin");
    });

    it("sends a user with no usable role to the home page", () => {
      expect(guardRedirect("/renter/profile-setup", true, null)).toBe("/");
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

    it("sends an incomplete renter to renter profile setup (S2-01)", () => {
      expect(
        guardRedirect("/dashboard/renter", true, "/renter/profile-setup"),
      ).toBe("/renter/profile-setup");
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
      expect(
        guardRedirect("/renter/profile-setup", true, "/dashboard/admin"),
      ).toBe("/dashboard/admin");
    });
  });
});
