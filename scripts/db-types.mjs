// Generates src/types/database.ts from the database schema (#258).
//
// CI runs this (`npm run db:types`) in the `database` job, against the
// throwaway local Supabase it starts with `npx supabase start`: every
// migration, applied to an empty database. When the result differs from
// the committed file, CI commits the new file to the PR's branch, so you
// never need to run this yourself. It needs Docker and that local
// Supabase, which our own machines don't have.
//
// The file used to come from the shared project (`gen types --linked`).
// Generating it from the migrations gives the same types, with one
// difference this script undoes: `gen types --local` leaves out the
// `__InternalSupabase` block, which tells supabase-js which PostgREST
// version the queries are typed against. Only the hosted project reports
// its version, so the script keeps the version that's already in the
// committed file, and the app stays typed against the shared project's
// PostgREST.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const TYPES_FILE = "src/types/database.ts";

// On Windows, npx is a .cmd file, which only runs through a shell.
const SHELL = process.platform === "win32";

/**
 * Puts the committed file's PostgREST version back into freshly generated
 * types that don't have an `__InternalSupabase` block. Returns `generated`
 * unchanged when it already has one, or when `committed` has none.
 */
export function keepPostgrestVersion(generated, committed) {
  // Inside the block: the comment above it also says "PostgrestVersion".
  const version =
    /__InternalSupabase\s*:\s*\{\s*PostgrestVersion:\s*["']([^"']+)["']/.exec(
      committed,
    )?.[1];
  // The block itself ("__InternalSupabase: {"). Every generated file also
  // has `Omit<Database, "__InternalSupabase">`, which doesn't count.
  const hasBlock = /__InternalSupabase\s*:\s*\{/.test(generated);
  if (!version || hasBlock) {
    return generated;
  }

  const start = /export type Database = \{\r?\n/;
  if (!start.test(generated)) {
    throw new Error(
      "db-types: the generated types have no `export type Database = {` line, so the PostgREST version can't be put back.",
    );
  }

  // The same block `gen types --linked` prints. Prettier formats it below.
  const block = [
    "  // Allows to automatically instantiate createClient with right options",
    "  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)",
    "  __InternalSupabase: {",
    `    PostgrestVersion: '${version}'`,
    "  }",
  ].join("\n");
  return generated.replace(start, (line) => `${line}${block}\n`);
}

function main() {
  let generated;
  try {
    generated = execFileSync(
      "npx",
      [
        "supabase",
        "gen",
        "types",
        "typescript",
        "--local",
        "--schema",
        "public",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], shell: SHELL },
    );
  } catch {
    console.error(
      "db-types: couldn't generate the types. This needs the local Supabase " +
        "that CI starts (Docker and `npx supabase start`). You don't need to " +
        "run it yourself: CI regenerates src/types/database.ts on your PR.",
    );
    process.exit(1);
  }

  const committed = existsSync(TYPES_FILE)
    ? readFileSync(TYPES_FILE, "utf8")
    : "";
  writeFileSync(TYPES_FILE, keepPostgrestVersion(generated, committed));

  // Formatted the same way as the rest of the repo, so `npm run
  // format:check` passes on the file CI commits.
  execFileSync("npx", ["prettier", "--write", TYPES_FILE], {
    stdio: "inherit",
    shell: SHELL,
  });
}

// Only when run as a script (`node scripts/db-types.mjs`), not when the
// unit test imports keepPostgrestVersion.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
