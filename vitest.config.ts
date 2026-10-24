import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Two kinds of tests live in this repo:
//
// - "unit" (`*.test.ts`): pure logic like Zod schemas, and the repo checks
//   in scripts/. Fast, no network, safe to run anywhere. This is what
//   `npm test` and CI run.
// - "db" (`*.db.test.ts`): talk to a real Supabase as the seed accounts
//   from supabase/seed.sql: whichever one NEXT_PUBLIC_SUPABASE_URL points
//   to. CI runs them (`npm run test:db`) on every PR against a throwaway
//   local Supabase, and against the SHARED project after each database
//   merge (#258). They're written to leave the data unchanged, since the
//   shared project is the database everyone uses. Run by hand, they use
//   .env.local, so they hit the shared project too.
export default defineConfig({
  resolve: {
    // Same "@/..." import alias as tsconfig.json.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Load .env.local (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY) into
    // process.env, the same way `next dev` does.
    env: loadEnv("test", process.cwd(), ""),
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
          exclude: ["src/**/*.db.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: ["src/**/*.db.test.ts"],
          // Network round-trips to Supabase are slower than unit tests.
          testTimeout: 20_000,
        },
      },
    ],
  },
});
