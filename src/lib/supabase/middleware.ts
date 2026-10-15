import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";
import { resolvePostLoginPath } from "@/lib/auth/post-login";

/**
 * Refreshes the Supabase auth session cookie on every request.
 * Without this, sessions silently expire mid-use — a user could
 * get logged out while filling in the add-listing form.
 *
 * It also guards `/dashboard/*` (see `guardDashboard` below): signed-out
 * users go to /login, and signed-in users can only open their own role's
 * dashboard. Pages can still do their own checks on top of this.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not remove: this refreshes the session token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const redirectTo = await guardDashboard(supabase, user, pathname);
    if (redirectTo) {
      const redirectResponse = NextResponse.redirect(
        new URL(redirectTo, request.url),
      );
      // Keep any refreshed session cookies, or the user would be signed
      // out by the redirect itself.
      supabaseResponse.cookies
        .getAll()
        .forEach((cookie) => redirectResponse.cookies.set(cookie));
      return redirectResponse;
    }
  }

  return supabaseResponse;
}

/**
 * Decides whether a `/dashboard/*` request is allowed.
 * Returns the path to redirect to, or null to let the request through.
 *
 * The role check reuses `resolvePostLoginPath` so "which dashboard does
 * this user belong on" is decided in one place (same as after login).
 */
async function guardDashboard(
  supabase: ReturnType<typeof createServerClient<Database>>,
  user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"],
  pathname: string,
): Promise<string | null> {
  // Signed out (e.g. after logging out and pressing Back) → log in first.
  if (!user) {
    return "/login";
  }

  const result = await resolvePostLoginPath(supabase, user);
  if (!result.ok) {
    // No usable role — the login page shows the explanation.
    return "/login";
  }

  // result.path is the user's own dashboard (or /profile-setup for a
  // landlord whose profile row had to be recreated).
  if (pathname === result.path || pathname.startsWith(result.path + "/")) {
    return null;
  }
  return result.path;
}
