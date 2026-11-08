/**
 * Which pages the proxy guards, and where it sends someone who can't
 * open one, without any Supabase calls, so it can be unit-tested
 * (route-guard.test.ts). `updateSession` in src/lib/supabase/middleware.ts
 * looks up the user and asks `resolvePostLoginPath` where they belong,
 * then hands both answers to `guardRedirect`.
 *
 * Guarded pages:
 * - `/dashboard/*`: each role only on its own dashboard
 *   (`/dashboard/renter`, `/dashboard/landlord` or `/dashboard/admin`,
 *   #256), so only admins can open the admin dashboard;
 * - `/profile-setup`: landlords only (#233). A signed-out visitor used to
 *   be able to fill in the whole form before finding out there was no
 *   session, and a renter's save failed at 0007's role trigger;
 * - `/renter/profile-setup`: renters only, and only while their profile is
 *   incomplete (S2-01). Complete renters and other roles are redirected
 *   to their own dashboards;
 * - `/listings/<id>`: signed-in users only (#93), while `/listings` itself
 *   remains public.
 */

const PROFILE_SETUP_PATH = "/profile-setup";
const RENTER_PROFILE_SETUP_PATH = "/renter/profile-setup";
const LISTINGS_PATH = "/listings";

/**
 * Where `resolvePostLoginPath` can send a landlord: their dashboard, or
 * profile setup when their profile row had to be recreated.
 */
const LANDLORD_PATHS = ["/dashboard/landlord", PROFILE_SETUP_PATH];

/** True for `base` itself and any page under it. */
function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(base + "/");
}

/** True for `/listings/<id>` and any page under it, but not `/listings` itself (#93). */
function isListingDetailPath(pathname: string): boolean {
  return (
    pathname.startsWith(LISTINGS_PATH + "/") &&
    pathname.length > LISTINGS_PATH.length + 1
  );
}

/** Whether the proxy checks who's signed in before showing this page. */
export function isGuardedPath(pathname: string): boolean {
  return (
    isUnder(pathname, "/dashboard") ||
    isUnder(pathname, PROFILE_SETUP_PATH) ||
    isUnder(pathname, RENTER_PROFILE_SETUP_PATH) ||
    isListingDetailPath(pathname)
  );
}

/**
 * Where to send a request for a guarded page, or null to let it through.
 *
 * - `signedIn`: whether the request has a user.
 * - `ownPath`: the path `resolvePostLoginPath` returned for that user
 *   (their own dashboard, `/profile-setup` for landlords, or
 *   `/renter/profile-setup` for incomplete renters), or null when it found
 *   no usable role.
 */
export function guardRedirect(
  pathname: string,
  signedIn: boolean,
  ownPath: string | null,
): string | null {
  // Signed out (e.g. after logging out and pressing Back) → home page,
  // where they can log in again from the modal.
  if (!signedIn) {
    return "/";
  }

  // No usable role → home page; logging in from the modal shows the
  // explanation.
  if (ownPath === null) {
    return "/";
  }

  // Listing detail pages are open to any signed-in user (#93).
  if (isListingDetailPath(pathname)) {
    return null;
  }

  // Landlord profile setup is for landlords only. Everyone else goes to their own
  // dashboard/path.
  if (isUnder(pathname, PROFILE_SETUP_PATH)) {
    return LANDLORD_PATHS.includes(ownPath) ? null : ownPath;
  }

  // Renter profile setup is for incomplete renters only. Complete renters and
  // other roles go to their own dashboard.
  if (isUnder(pathname, RENTER_PROFILE_SETUP_PATH)) {
    return ownPath === RENTER_PROFILE_SETUP_PATH ? null : ownPath;
  }

  // A dashboard page: only the user's own.
  return isUnder(pathname, ownPath) ? null : ownPath;
}
