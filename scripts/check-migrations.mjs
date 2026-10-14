// Checks supabase/migrations/ for the two mistakes that have bitten us:
//
// 1. Two migrations with the same number. Supabase tracks migrations by
//    the number prefix, not the full filename, so the second file is
//    silently treated as already applied and never runs (#172).
// 2. Editing, renaming, or deleting a migration that's already on the
//    base branch. Those have been (or will be) pushed to the shared
//    database, and Supabase won't re-run them — the change does nothing
//    to the real schema and leaves the repo lying about it. Write a new
//    migration instead.
//
// Runs in `npm run check` and in CI, so it protects everyone — not just
// people using Claude Code (which also has a hook for check 2, see
// .claude/hooks/protect-applied-migrations.mjs).
//
// Usage:
//   node scripts/check-migrations.mjs                   # base = origin/dev
//   node scripts/check-migrations.mjs --base origin/main
//
// Check 2 compares against your last `git fetch` of the base branch. If
// the base branch isn't available (e.g. a fresh shallow clone), it's
// skipped with a warning.

import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";

const MIGRATIONS_DIR = "supabase/migrations";
// Expected filename: 4-digit number, underscore, snake_case name, .sql
const FILENAME_PATTERN = /^(\d{4})_[a-z0-9_]+\.sql$/;

const baseFlag = process.argv.indexOf("--base");
const base = baseFlag !== -1 ? process.argv[baseFlag + 1] : "origin/dev";

const errors = [];

// --- Check 1: filenames and unique numbers ---------------------------

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
const filesByNumber = new Map();

for (const file of files) {
  const match = FILENAME_PATTERN.exec(file);
  if (!match) {
    errors.push(
      `${file}: name should look like 0008_short_description.sql ` +
        `(4-digit number, lowercase snake_case).`,
    );
    continue;
  }
  const number = match[1];
  filesByNumber.set(number, [...(filesByNumber.get(number) ?? []), file]);
}

for (const [number, sameNumber] of filesByNumber) {
  if (sameNumber.length > 1) {
    errors.push(
      `Migration number ${number} is used more than once: ` +
        `${sameNumber.join(", ")}. Supabase would skip all but the first. ` +
        `Renumber the new one to the highest number + 1.`,
    );
  }
}

// --- Check 2: don't touch migrations that are already on the base ----

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

let baseAvailable = true;
try {
  git("rev-parse", "--verify", "--quiet", `${base}^{commit}`);
} catch {
  baseAvailable = false;
  console.warn(
    `check-migrations: ${base} not found — skipping the "don't edit ` +
      `applied migrations" check. Run \`git fetch\` to enable it.`,
  );
}

if (baseAvailable) {
  // Three dots = only what changed on this branch since it left the
  // base, not changes that landed on the base afterwards.
  // --no-renames reports a rename as delete + add, so it's caught too.
  const changes = git(
    "diff",
    "--name-status",
    "--no-renames",
    `${base}...HEAD`,
    "--",
    MIGRATIONS_DIR,
  );

  for (const line of changes.split("\n").filter(Boolean)) {
    const [status, file] = line.split("\t");
    // "A" (added) is the only allowed change to an existing branch's
    // migrations folder. "M" = modified, "D" = deleted (or renamed away).
    if (status !== "A") {
      const verb = status === "D" ? "deleted or renamed" : "modified";
      errors.push(
        `${file} is already on ${base} and was ${verb} on this branch. ` +
          `Applied migrations can't change — revert it and put the change ` +
          `in a new migration (next number in sequence).`,
      );
    }
  }
}

// --- Report -----------------------------------------------------------

if (errors.length > 0) {
  console.error("check-migrations failed:\n");
  for (const error of errors) console.error(`  - ${error}`);
  console.error("\nSee AGENTS.md → Known gotchas / Database (Supabase).");
  process.exit(1);
}

console.log(`check-migrations: ${files.length} migrations OK.`);
