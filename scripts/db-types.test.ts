import { describe, expect, it } from "vitest";
import { keepPostgrestVersion } from "./db-types.mjs";

// What `npx supabase gen types typescript --local` prints, shortened: no
// __InternalSupabase block, but the Omit<...> helper every generated file
// has (which must not count as a block).
const GENERATED = `export type Json = string | number | boolean | null

export type Database = {
  public: {
    Tables: {}
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
`;

// The committed src/types/database.ts, shortened: it has the block.
const COMMITTED = `export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  public: {
    Tables: {};
  };
};
`;

// GENERATED with the committed version put back (before Prettier).
const EXPECTED = `export type Json = string | number | boolean | null

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.17'
  }
  public: {
    Tables: {}
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
`;

describe("keepPostgrestVersion", () => {
  it("puts the committed PostgREST version back into generated types", () => {
    expect(keepPostgrestVersion(GENERATED, COMMITTED)).toBe(EXPECTED);
  });

  it("keeps a block the generated types already have", () => {
    const withBlock = EXPECTED.replace("14.17", "15.1");
    expect(keepPostgrestVersion(withBlock, COMMITTED)).toBe(withBlock);
  });

  it("changes nothing when the committed file has no block", () => {
    expect(keepPostgrestVersion(GENERATED, GENERATED)).toBe(GENERATED);
    expect(keepPostgrestVersion(GENERATED, "")).toBe(GENERATED);
  });

  it("fails when the generated types have no Database type", () => {
    expect(() =>
      keepPostgrestVersion("export type Json = string\n", COMMITTED),
    ).toThrow("export type Database");
  });
});
