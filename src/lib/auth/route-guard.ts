/**
 * Which pages the proxy guards, and where it sends someone who can't
 * open one, without any Supabase calls, so it can be unit-tested
 * (route-guard.test.ts). `updateSession` in src/lib/supabase/middleware.ts
 * looks up the user and asks `resolvePostLoginPath` where they belong,
 * then hands both answers to `guardRedirect`.
 *
 * Guarded pages:
 * - `/dashboard/*`: each role only on its own dashboard;
 * - `/profile-setup`: landlords only (#233). A signed-out visitor used to
 *   be able to fill in the whole form before finding out there was no
 *   session, and a renter's save failed at 0007's role trigger.
 */

const PROFILE_SETUP_PATH = "/profile-setup";

/**
 * Where `resolvePostLoginPath` can send a landlord: their dashboard, or
 * profile setup when their profile row had to be recreated.
 */
const LANDLORD_PATHS = ["/dashboard/landlord", PROFILE_SETUP_PATH];

/** True for `base` itself and any page under it. */
function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(base + "/");
}

/** Whether the proxy checks who's signed in before showing this page. */
export function isGuardedPath(pathname: string): boolean {
  return (
    isUnder(pathname, "/dashboard") || isUnder(pathname, PROFILE_SETUP_PATH)
  );
}

/**
 * Where to send a request for a guarded page, or null to let it through.
 *
 * - `signedIn`: whether the request has a user.
 * - `ownPath`: the path `resolvePostLoginPath` returned for that user
 *   (their own dashboard, or `/profile-setup` for a landlord whose profile
 *   row had to be recreated), or null when it found no usable role.
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

  // Profile setup is for landlords only. Everyone else goes to their own
  // dashboard.
  if (isUnder(pathname, PROFILE_SETUP_PATH)) {
    return LANDLORD_PATHS.includes(ownPath) ? null : ownPath;
  }

  // A dashboard page: only the user's own.
  return isUnder(pathname, ownPath) ? null : ownPath;
}
