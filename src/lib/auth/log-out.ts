import { createClient } from "@/lib/supabase/client";

/**
 * Logs the user out and goes to the home page. The dashboard layouts' Log
 * Out button calls it (landlord, and admin #256), so they can't drift
 * apart; the renter dashboard's layout (#84) should use it too. Runs in
 * the browser.
 *
 * Not router.push: that keeps the dashboard in browser history and in
 * Next's client-side cache, so pressing Back would show it again without
 * asking the server. A full replace drops this page's history entry and
 * Next's cache. Dashboard pages visited before it are still in the
 * history, though, and Back can show the browser's own copy of one of
 * them: <SignedInOnly /> in each layout sends that copy home (#252).
 */
export async function logOut(): Promise<void> {
  const supabase = createClient();
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Logout error:", err);
  } finally {
    window.location.replace("/");
  }
}
