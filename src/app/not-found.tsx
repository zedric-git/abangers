import { redirect } from "next/navigation";
import { connection } from "next/server";

/**
 * Next shows this for any URL the app doesn't have (an old path, a typo),
 * and for any notFound() call left anywhere. The PM doesn't want anyone to
 * land on a 404 page, so it sends them to the home page instead (#244),
 * like the old /login and /signup URLs (see redirects() in next.config.ts).
 *
 * A listing that's missing doesn't come here: its page redirects to a
 * better place itself (see src/lib/listing-lookup.ts).
 */
export default async function NotFound() {
  // Render this per request, not once at build time. Built ahead, the
  // production server answers an unknown URL with a 404 and an empty page
  // that only moves to / once its JavaScript has loaded. Per request, it
  // answers with a real redirect (307) to /, as `next dev` does.
  await connection();
  redirect("/");
}
