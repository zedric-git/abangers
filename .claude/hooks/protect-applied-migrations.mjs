// Claude Code PreToolUse hook: blocks edits to migrations that are
// already merged into `dev`.
//
// AGENTS.md rule: "Never edit a migration that's already been pushed —
// write a new one." Supabase records migrations by number, so editing an
// applied file does nothing to the shared database and leaves the repo
// lying about the schema.
//
// "Applied" is approximated as "exists on origin/dev": once a migration
// is merged there, someone has pushed (or will push) it to the shared
// project. New migration files, and ones only on your feature branch,
// can still be edited freely.
//
// Exit codes (Claude Code hook contract):
//   0 → allow the tool call
//   2 → block it; stderr is shown to Claude as the reason

import { execFileSync } from "node:child_process";
import path from "node:path";

let input = "";
for await (const chunk of process.stdin) input += chunk;

let filePath;
try {
  // Strip a UTF-8 byte-order mark (Windows PowerShell adds one when piping).
  filePath = JSON.parse(input.replace(/^\uFEFF/, "")).tool_input?.file_path;
} catch {
  process.exit(0); // Unexpected input — don't get in the way.
}
if (!filePath) process.exit(0);

// Repo root = two levels up from this file (.claude/hooks/). Derived from
// the script's own location rather than $CLAUDE_PROJECT_DIR because on
// Windows that can be a Git Bash path ("/c/Users/...") while the tool's
// file_path is native ("C:\Users\..."), and the two won't compare.
const projectDir = path.resolve(import.meta.dirname, "..", "..");
// Repo-relative, forward slashes (git wants "supabase/migrations/x.sql").
const relative = path
  .relative(projectDir, path.resolve(projectDir, filePath))
  .split(path.sep)
  .join("/");

if (!/^supabase\/migrations\/[^/]+\.sql$/.test(relative)) process.exit(0);

let onDev = false;
try {
  // Succeeds only if the file exists in the last-fetched origin/dev.
  execFileSync("git", ["cat-file", "-e", `origin/dev:${relative}`], {
    cwd: projectDir,
    stdio: "ignore",
  });
  onDev = true;
} catch {
  onDev = false; // Not on dev (or git unavailable) — allow.
}

if (onDev) {
  console.error(
    `Blocked: ${relative} is already merged into dev, so it has been (or ` +
      `will be) applied to the shared Supabase project. Don't edit applied ` +
      `migrations — create a new file with the next number in ` +
      `supabase/migrations/ instead (see AGENTS.md, "Database (Supabase)").`,
  );
  process.exit(2);
}
process.exit(0);
