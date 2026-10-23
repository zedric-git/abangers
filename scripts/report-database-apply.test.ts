import { describe, expect, it } from "vitest";
import { buildReport, testFailures } from "./report-database-apply.mjs";

// What apply-database passes in after a merge where every step passed.
const SUCCESS = {
  dryRun: false,
  outcomes: {
    ci: "success",
    connect: "success",
    pending: "success",
    push: "success",
    seed: "success",
    tests: "success",
  },
  pending: ["0015_add_favorites.sql"],
  pendingError: "",
  added: ["0015_add_favorites.sql"],
  logs: { pending: "", push: "", seed: "", tests: "" },
  runUrl: "https://github.com/zedric-git/abangers/actions/runs/1",
  team: "@zedric-git @ejkatealcover @chilsi-n",
  pm: "@zedric-git",
};

/** SUCCESS with some steps' outcomes changed. */
function withOutcomes(outcomes: Partial<typeof SUCCESS.outcomes>) {
  return { ...SUCCESS, outcomes: { ...SUCCESS.outcomes, ...outcomes } };
}

describe("buildReport", () => {
  it("lists what was applied and tells the team", () => {
    const report = buildReport(SUCCESS);
    expect(report).toContain("Applied to the shared database");
    expect(report).toContain("applied `0015_add_favorites.sql`");
    expect(report).toContain(SUCCESS.team);
    expect(report).toContain("git pull origin dev");
    expect(report).toContain(SUCCESS.runUrl);
    expect(report).not.toContain("earlier merge");
  });

  it("names a migration from an earlier merge that wasn't applied then", () => {
    const report = buildReport({
      ...SUCCESS,
      pending: ["0015_add_favorites.sql", "0016_add_reviews.sql"],
      added: ["0016_add_reviews.sql"],
    });
    expect(report).toContain(
      "`0015_add_favorites.sql` came from an earlier merge",
    );
  });

  it("says nothing was applied when CI failed, and asks the PM", () => {
    const report = buildReport(
      withOutcomes({
        ci: "failure",
        connect: "skipped",
        pending: "skipped",
        push: "skipped",
        seed: "skipped",
        tests: "skipped",
      }),
    );
    expect(report).toContain("wasn't updated");
    expect(report).toContain("CI didn't pass");
    expect(report).toContain(SUCCESS.pm);
    expect(report).not.toContain(SUCCESS.team);
  });

  it("says which secret to add when it can't connect", () => {
    const report = buildReport(
      withOutcomes({ connect: "failure", pending: "skipped" }),
    );
    expect(report).toContain("SUPABASE_DB_PASSWORD");
    expect(report).toContain("shared-db");
  });

  it("warns against migration repair when the shared database has an extra migration", () => {
    const report = buildReport({
      ...withOutcomes({ pending: "failure", push: "skipped" }),
      pending: null,
      pendingError:
        "Remote migration versions not found in local migrations directory.",
    });
    expect(report).toContain("changed nothing");
    expect(report).toContain("isn't in `supabase/migrations/`");
    expect(report).toContain("Don't run `supabase migration repair`");
  });

  it("explains a migration numbered below an applied one", () => {
    const report = buildReport({
      ...withOutcomes({ pending: "failure", push: "skipped" }),
      pending: null,
      pendingError:
        "Found local migration files to be inserted before the last migration on remote database.",
    });
    expect(report).toContain("numbered below one that's already applied");
    expect(report).toContain("--include-all");
  });

  it("shows the error when the check fails for another reason", () => {
    const report = buildReport({
      ...withOutcomes({ pending: "failure", push: "skipped" }),
      pending: null,
      logs: {
        ...SUCCESS.logs,
        pending: "failed to connect: password authentication failed",
      },
    });
    expect(report).toContain("password authentication failed");
    expect(report).toContain("SUPABASE_DB_PASSWORD");
  });

  it("lists what's pending in a dry run, without telling the team", () => {
    const report = buildReport({ ...SUCCESS, dryRun: true, added: null });
    expect(report).toContain("Dry run");
    expect(report).toContain("`0015_add_favorites.sql`");
    expect(report).not.toContain(SUCCESS.team);
  });

  it("says when a dry run finds nothing pending", () => {
    const report = buildReport({
      ...SUCCESS,
      dryRun: true,
      pending: [],
      added: null,
    });
    expect(report).toContain("nothing is pending");
  });

  it("says nothing from a failed migration was applied, and not to repair or edit it", () => {
    const report = buildReport({
      ...withOutcomes({ push: "failure", seed: "skipped", tests: "skipped" }),
      logs: {
        ...SUCCESS.logs,
        push: 'Applying migration 0015_add_favorites.sql...\nERROR: check constraint "x" is violated by some row',
      },
    });
    expect(report).toContain("A migration failed on the shared database");
    expect(report).toContain("nothing from the failing one was applied");
    expect(report).toContain("is violated by some row");
    expect(report).toContain("don't edit or delete the merged migration");
    expect(report).toContain("supabase migration repair");
    expect(report).toContain(SUCCESS.pm);
  });

  it("tells the team the database changed even when the DB tests failed", () => {
    const report = buildReport({
      ...withOutcomes({ tests: "failure" }),
      logs: {
        ...SUCCESS.logs,
        tests:
          " FAIL  src/__tests__/rls-listings.db.test.ts > listings RLS > a renter cannot create a listing\n Test Files  1 failed | 4 passed (5)",
      },
    });
    expect(report).toContain("DB tests failed on the shared project");
    expect(report).toContain("a renter cannot create a listing");
    expect(report).toContain(SUCCESS.team);
  });

  it("blames Supabase's sign-in rate limit when that's what stopped the tests", () => {
    const report = buildReport({
      ...withOutcomes({ tests: "failure" }),
      logs: {
        ...SUCCESS.logs,
        tests:
          " FAIL  src/__tests__/rls-profiles.db.test.ts > profiles role lock\nError: Couldn't sign in as renter1@abangers.test (Request rate limit reached). Is the seed data loaded? Run: npm run db:seed",
      },
    });
    expect(report).toContain("Authentication → Rate Limits");
    expect(report).not.toContain("behaves differently");
  });
});

describe("testFailures", () => {
  it("keeps only Vitest's failed tests and totals", () => {
    const log = [
      " ✓ src/__tests__/rls-profiles.db.test.ts (7 tests) 912ms",
      " FAIL  src/__tests__/rls-listings.db.test.ts > listings RLS > a renter cannot create a listing",
      "AssertionError: expected '42501' to be undefined",
      " Test Files  1 failed | 4 passed (5)",
      "      Tests  1 failed | 99 passed (100)",
    ].join("\n");
    expect(testFailures(log)).toBe(
      [
        " FAIL  src/__tests__/rls-listings.db.test.ts > listings RLS > a renter cannot create a listing",
        " Test Files  1 failed | 4 passed (5)",
        "      Tests  1 failed | 99 passed (100)",
      ].join("\n"),
    );
  });

  it("falls back to the end of the log", () => {
    expect(testFailures("npm error code 1\n")).toBe("npm error code 1");
  });
});
