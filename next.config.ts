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
  //
  // "Viewing" pages are "visit" pages now (#321): My Viewings became My
  // Visits and Viewing Requests became Visit Requests. The old URLs go to
  // the new pages, so old links and bookmarks still work.
  async redirects() {
    return [
      { source: "/login", destination: "/", permanent: false },
      { source: "/signup", destination: "/", permanent: false },
      {
        source: "/dashboard/renter/viewings",
        destination: "/dashboard/renter/visits",
        permanent: false,
      },
      {
        source: "/dashboard/landlord/viewing-requests",
        destination: "/dashboard/landlord/visit-requests",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
