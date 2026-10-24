// Reports what CI's apply-database job did (#258): on the run's summary
// page, and as a comment on the merged PR, so nobody has to tell the team
// by hand.
//
// The job's last step runs it, whatever happened before. It reads each
// step's outcome ("success", "failure" or "skipped") from the environment
// (see the Report step in .github/workflows/ci.yml) and the logs those
// steps saved in $LOG_DIR. Then it says what was applied, or which step
// failed, with the error and what to do next.

import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// `supabase db push`'s own messages for the two kinds of drift between
// supabase/migrations/ and the shared database.
const MISSING_LOCAL =
  "Remote migration versions not found in local migrations directory";
const MISSING_REMOTE =
  "Found local migration files to be inserted before the last migration on remote database";

/** `text` without the terminal's colour codes. */
function plain(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

/** The last `count` lines of a log. */
export function lastLines(log, count) {
  return plain(log).trimEnd().split("\n").slice(-count).join("\n");
}

/** Vitest's failed tests and totals, or the end of the log if it has none. */
export function testFailures(log) {
  const lines = plain(log)
    .split("\n")
    .filter((line) => /^\s*(FAIL\s|Test Files\s|Tests\s)/.test(line));
  return lines.length > 0 ? lines.slice(-25).join("\n") : lastLines(log, 30);
}

/** A log excerpt, collapsed. */
function details(summary, log) {
  // Four backticks, so a ``` inside the log can't end the block early.
  return [
    `<details><summary>${summary}</summary>`,
    "",
    "````text",
    log,
    "````",
    "",
    "</details>",
  ].join("\n");
}

/** File names as inline code: `a.sql`, `b.sql`. */
function names(files) {
  return files.map((file) => `\`${file}\``).join(", ");
}

/** What happened to the migrations, as a sentence. */
function appliedSentence(pending) {
  if (pending === null) return "The pending migrations were applied.";
  if (pending.length === 0) return "No migrations were pending.";
  return `Applied ${names(pending)}.`;
}

/**
 * The report, as markdown. `input`:
 * - dryRun: "Run workflow" without "apply" ticked.
 * - outcomes: each step's outcome: { ci, connect, pending, push, seed, tests }.
 * - pending: the migrations the dry run found (file names), or null if it
 *   didn't get that far.
 * - pendingError: the dry run's error message, or "".
 * - added: the migrations this push added (file names), or null for
 *   "Run workflow".
 * - logs: what the pending, push, seed and tests steps printed.
 * - runUrl: this run's page. team, pm: who to @-mention.
 */
export function buildReport({
  dryRun,
  outcomes,
  pending,
  pendingError,
  added,
  logs,
  runUrl,
  team,
  pm,
}) {
  const run = `[this run](${runUrl})`;
  const changed = `${team}: the shared database changed. If your branch needs these changes, merge \`dev\` into it (\`git pull origin dev\`).`;

  if (outcomes.ci !== "success") {
    return [
      "### ⏸️ The shared database wasn't updated",
      "",
      `CI didn't pass on this commit, so ${run} left the shared database alone.`,
      "",
      'Once CI passes on `dev`, re-run this job ("Re-run failed jobs" on the run\'s page). The next database merge would also apply it, together with its own changes.',
      "",
      pm,
    ].join("\n");
  }

  if (outcomes.connect !== "success") {
    return [
      "### ⚠️ The shared database wasn't updated",
      "",
      `${run} couldn't connect: the \`shared-db\` environment is missing its \`SUPABASE_DB_PASSWORD\` or \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` secret. Add it (AGENTS.md, "Database (Supabase)"), then re-run this job.`,
      "",
      pm,
    ].join("\n");
  }

  if (outcomes.pending !== "success") {
    const error = [pendingError, lastLines(logs.pending, 20)]
      .filter(Boolean)
      .join("\n");
    let meaning;
    if (error.includes(MISSING_LOCAL)) {
      meaning =
        "**The shared database has a migration that isn't in `supabase/migrations/` on `dev`**: someone applied one by hand, or from a branch that never merged. Re-running an old run after newer migrations were applied looks the same: run the newest one instead. **Don't run `supabase migration repair`**, even though the CLI suggests it: it would hide the difference, not fix it.";
    } else if (error.includes(MISSING_REMOTE)) {
      meaning =
        "**`dev` has a migration numbered below one that's already applied**, so Supabase won't apply it. Usually two PRs added migrations at the same time and merged in the opposite order. If it doesn't depend on the newer one, it can be applied out of order with `npx supabase db push --linked --include-all`.";
    } else {
      meaning =
        "The CLI couldn't check the shared database. If the error is about connecting or the password, check the `shared-db` environment's `SUPABASE_DB_PASSWORD` secret.";
    }
    return [
      "### ❌ The shared database wasn't updated",
      "",
      `Checking what's pending on the shared project failed, so ${run} changed nothing.`,
      "",
      meaning,
      "",
      details("The error", error),
      "",
      `${pm} decides the fix.`,
    ].join("\n");
  }

  if (dryRun) {
    if (pending !== null && pending.length === 0) {
      return [
        "### 🔍 Dry run: nothing is pending",
        "",
        `The shared project has every migration on \`dev\` (${run}). Nothing was changed.`,
      ].join("\n");
    }
    return [
      "### 🔍 Dry run: the shared database wasn't changed",
      "",
      `Pending on the shared project: ${pending === null ? "see the log" : names(pending)} (${run}).`,
      "",
      'To apply it, run the workflow again with "apply" ticked. After a merge, this job applies it by itself while the `DB_AUTO_APPLY` variable is `true`.',
    ].join("\n");
  }

  if (outcomes.push !== "success") {
    return [
      "### ❌ A migration failed on the shared database",
      "",
      `\`db push\` stopped at a migration that failed on the shared project (${run}). Each migration runs in its own transaction, so nothing from the failing one was applied. Any the log shows as applied before it stay applied.`,
      "",
      details("The log", lastLines(logs.push, 40)),
      "",
      `**What to do:** don't edit or delete the merged migration, and don't run \`supabase migration repair\`. It passed on CI's throwaway database, which only has the seed data, so the shared database probably has rows it rejects. A new migration can't fix that by itself: \`db push\` applies migrations in order, and would stop at this one again. ${pm} decides the fix: usually correcting those rows, then re-running this job.`,
    ].join("\n");
  }

  if (outcomes.seed !== "success") {
    return [
      "### ⚠️ Migrations applied, but the seed failed",
      "",
      `${appliedSentence(pending)} Re-running the seed then failed (${run}), so the seed accounts and sample listings may not be in their seed state.`,
      "",
      details("The log", lastLines(logs.seed, 40)),
      "",
      `It worked on CI's throwaway database, so the shared project's data is probably the difference. Fix \`supabase/seed.sql\` or \`supabase/seed-storage.mjs\` in a new PR: merging it re-runs this job. ${pm}`,
      "",
      changed,
    ].join("\n");
  }

  if (outcomes.tests !== "success") {
    // Supabase limits how often one address can sign in, and the DB tests
    // sign in as the seed accounts dozens of times: with the shared
    // project's limit too low, tests fail before they test anything.
    const why = logs.tests.includes("Request rate limit reached")
      ? `Supabase's sign-in rate limit stopped some of them before they ran ("Request rate limit reached"): the DB tests sign in as the seed accounts dozens of times. Raise "sign-ups and sign-ins" in the shared project's dashboard (Authentication → Rate Limits), then re-run this job. ${pm}`
      : `They passed on CI's throwaway database, so the shared project behaves differently: its data, or a different Supabase version. Fix the test or the migration in a new PR. ${pm}`;
    return [
      "### ⚠️ Applied, but DB tests failed on the shared project",
      "",
      `${appliedSentence(pending)} The seed re-ran. Then DB tests failed on the shared project (${run}):`,
      "",
      details("Failed tests", testFailures(logs.tests)),
      "",
      why,
      "",
      changed,
    ].join("\n");
  }

  // Migrations that were pending but didn't come with this push: an
  // earlier merge's run didn't apply them (it failed, or was cancelled).
  const earlier =
    added === null || pending === null
      ? []
      : pending.filter((file) => !added.includes(file));
  const migrations =
    pending === null
      ? "applied (see the log)."
      : pending.length === 0
        ? "none were pending."
        : `applied ${names(pending)}.`;
  return [
    "### ✅ Applied to the shared database",
    "",
    `After this merge (${run}):`,
    "",
    `- **Migrations:** ${migrations}`,
    "- **Seed:** re-ran `supabase/seed.sql` and `supabase/seed-storage.mjs`, so the seed accounts and sample listings are back to their seed state.",
    "- **DB tests on the shared project:** passed.",
    ...(earlier.length > 0
      ? [
          "",
          `${names(earlier)} came from an earlier merge that wasn't applied then.`,
        ]
      : []),
    "",
    changed,
  ].join("\n");
}

/** A file in the logs folder, or "" if that step didn't write it. */
function readLog(logDir, name) {
  const file = path.join(logDir, name);
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

/** The migrations a push added (file names), from git. */
function addedMigrations(before, sha) {
  // No "before" for a new branch (all zeros), or outside a push.
  if (!before || /^0+$/.test(before)) return [];
  const output = execFileSync(
    "git",
    [
      "diff",
      "--name-only",
      "--diff-filter=A",
      before,
      sha,
      "--",
      "supabase/migrations",
    ],
    { encoding: "utf8" },
  );
  return output
    .split("\n")
    .filter(Boolean)
    .map((file) => path.basename(file));
}

function main() {
  const env = process.env;
  const logDir = env.LOG_DIR ?? ".";
  mkdirSync(logDir, { recursive: true });
  const isPush = env.GITHUB_EVENT_NAME === "push";

  // The dry run's result: { migrations: [...] }, or { error: {...} } when
  // it failed. Missing if it never ran.
  let dryRunResult = null;
  try {
    dryRunResult = JSON.parse(readLog(logDir, "pending.json"));
  } catch {
    // It didn't get that far.
  }

  const markdown = buildReport({
    dryRun: env.DRY_RUN === "true",
    outcomes: {
      ci: env.CI_OUTCOME,
      connect: env.CONNECT_OUTCOME,
      pending: env.PENDING_OUTCOME,
      push: env.PUSH_OUTCOME,
      seed: env.SEED_OUTCOME,
      tests: env.TESTS_OUTCOME,
    },
    pending: Array.isArray(dryRunResult?.migrations)
      ? dryRunResult.migrations
      : null,
    pendingError: dryRunResult?.error?.message ?? "",
    added: isPush ? addedMigrations(env.BEFORE, env.GITHUB_SHA) : null,
    logs: {
      pending: readLog(logDir, "pending.log"),
      push: readLog(logDir, "push.log"),
      seed: readLog(logDir, "seed.log"),
      tests: readLog(logDir, "tests.log"),
    },
    runUrl: `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`,
    team: env.TEAM ?? "",
    pm: env.PM ?? "",
  });

  console.log(markdown);
  if (env.GITHUB_STEP_SUMMARY) {
    appendFileSync(env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  }

  // Only a merge has a PR to comment on: "Run workflow" only gets the
  // summary.
  if (!isPush) return;
  const pr = execFileSync(
    "gh",
    [
      "api",
      `repos/${env.GITHUB_REPOSITORY}/commits/${env.GITHUB_SHA}/pulls`,
      "--jq",
      ".[0].number // empty",
    ],
    { encoding: "utf8" },
  ).trim();
  if (!pr) {
    console.log(
      "No PR found for this commit, so no comment: the run's summary has the report.",
    );
    return;
  }
  const bodyFile = path.join(logDir, "report.md");
  writeFileSync(bodyFile, markdown);
  execFileSync(
    "gh",
    [
      "pr",
      "comment",
      pr,
      "--repo",
      env.GITHUB_REPOSITORY,
      "--body-file",
      bodyFile,
    ],
    { stdio: "inherit" },
  );
}

// Only when run as a script, not when the unit test imports buildReport.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
