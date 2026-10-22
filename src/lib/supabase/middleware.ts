import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";
import { resolvePostLoginPath } from "@/lib/auth/post-login";
import { guardRedirect, isGuardedPath } from "@/lib/auth/route-guard";

/**
 * Refreshes the Supabase auth session cookie on every request.
 * Without this, sessions silently expire mid-use — a user could
 * get logged out while filling in the add-listing form.
 *
 * It also guards `/dashboard/*` and `/profile-setup` (see
 * src/lib/auth/route-guard.ts): signed-out users go to the home page,
 * signed-in users can only open their own role's dashboard, and only
 * landlords can open profile setup. Pages can still do their own checks
 * on top of this.
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
  if (isGuardedPath(pathname)) {
    // Where this user belongs, decided by the same code as after login
    // (#170), so the two can't drift apart. Only looked up for a
    // signed-in user: a signed-out one goes home either way.
    let ownPath: string | null = null;
    if (user) {
      const result = await resolvePostLoginPath(supabase, user);
      ownPath = result.ok ? result.path : null;
    }

    const redirectTo = guardRedirect(pathname, user !== null, ownPath);
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
