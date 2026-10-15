import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // The /login and /signup pages were removed (login and sign-up happen
  // in the modal on the home page). Send old bookmarks, history entries
  // and links home instead of showing a 404. `permanent: false` so
  // browsers don't cache the redirect forever, in case a route with one
  // of these names comes back later (e.g. renter sign-up in Sprint 2).
  async redirects() {
    return [
      { source: "/login", destination: "/", permanent: false },
      { source: "/signup", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
