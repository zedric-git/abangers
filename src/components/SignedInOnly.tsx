"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Sends a signed-out browser to the home page from a page that's only for
 * signed-in users (#252). It renders nothing.
 *
 * WHY: the proxy (src/proxy.ts) already sends signed-out users home, but
 * only when a request reaches the server. After logging out, the
 * browser's Back button can show a copy of a dashboard page the browser
 * kept, without asking the server, so the previous user's listings or
 * phone number are back on screen. That copy comes from one of two
 * places, and this component's check runs in both:
 *   - the HTTP cache: a fresh page load from a stored copy (what `next dev`
 *     does, because it doesn't send `no-store`), so the check runs when
 *     the page starts;
 *   - the back/forward cache: the old page is restored as it was, without
 *     starting again, but the browser fires `pageshow` with
 *     `event.persisted`, so the check runs then.
 *
 * It only reads the session the browser already has (getSession reads the
 * cookies; no request unless an expired session needs refreshing), so a
 * signed-in user's pages don't get slower and Back / Forward work as
 * before. The proxy is still what decides who can open a page: this only
 * clears a stale copy off the screen.
 *
 * Used by the landlord dashboard layout and /profile-setup. Add it to any
 * other page that shows a signed-in user's data and isn't under those.
 */
export default function SignedInOnly() {
  useEffect(() => {
    const supabase = createClient();

    async function leaveIfSignedOut() {
      const { data, error } = await supabase.auth.getSession();
      // `error` (e.g. no connection while refreshing an expired session)
      // isn't proof of being signed out, so only leave when there's
      // clearly no session.
      if (!error && !data.session) {
        // A hard replace, like the logout itself, so this page isn't kept
        // in the history either.
        window.location.replace("/");
      }
    }

    // The page just started: a normal load, or a copy from the HTTP cache.
    void leaveIfSignedOut();

    // The page was restored from the back/forward cache: effects don't run
    // again, but pageshow does, with persisted = true.
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        void leaveIfSignedOut();
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
