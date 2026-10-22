import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

// These tests run the real script on temporary files. The invisible
// characters are built with String.fromCodePoint, so this file doesn't
// contain any itself (and passes the check).

const SCRIPT = fileURLToPath(
  new URL("./check-invisible-chars.mjs", import.meta.url),
);
const ROOT = path.resolve(path.dirname(SCRIPT), "..");

const tempDir = mkdtempSync(path.join(tmpdir(), "check-invisible-chars-"));
afterAll(() => rmSync(tempDir, { recursive: true, force: true }));

const char = (...codePoints: number[]) => String.fromCodePoint(...codePoints);

// Runs `node scripts/check-invisible-chars.mjs <files>`.
function run(...files: string[]) {
  const result = spawnSync(process.execPath, [SCRIPT, ...files], {
    encoding: "utf8",
  });
  return { exitCode: result.status, output: result.stdout + result.stderr };
}

let fileCount = 0;
// Writes `content` to a new temporary file and returns its path.
function tempFile(content: string | Buffer) {
  fileCount++;
  const file = path.join(tempDir, `file-${fileCount}.txt`);
  writeFileSync(file, content);
  return file;
}

// Writes `content` to a temporary file and runs the check on it.
function check(content: string | Buffer) {
  const file = tempFile(content);
  return { file, ...run(file) };
}

describe("check-invisible-chars", () => {
  it("passes visible non-ASCII and emoji", () => {
    const text = [
      "dashes, arrows, lines: — – → ─ · ©",
      "money and full-width digits: ₱1,500 ０９１７",
      "emoji: 👍 📍 🟢",
      // A red heart is a heart + variation selector 16 ("show as emoji").
      `heart: ${char(0x2764, 0xfe0f)}`,
      // Woman technologist = woman + zero-width joiner + laptop, also
      // with a skin tone between the woman and the joiner.
      `technologist: ${char(0x1f469, 0x200d, 0x1f4bb)}`,
      `technologist: ${char(0x1f469, 0x1f3fd, 0x200d, 0x1f4bb)}`,
    ].join("\n");

    const { exitCode, output } = check(text);
    expect(output).toContain("check-invisible-chars: 1 file OK.");
    expect(exitCode).toBe(0);
  });

  // One character from each group in INVISIBLE_CHARACTERS.
  it.each([
    ["001B", "control character"],
    ["0085", "next line (NEL)"],
    ["00A0", "no-break space"],
    ["2009", "special-width space (en, em, thin, hair, ...)"],
    ["2028", "line separator"],
    ["3000", "ideographic (full-width) space"],
    ["00AD", "soft hyphen"],
    ["200B", "zero-width space"],
    ["2060", "word joiner"],
    ["FEFF", "zero-width no-break space (byte order mark)"],
    ["202E", "text-direction embedding or override"],
    ["2066", "text-direction isolate"],
    ["3164", "Hangul filler (invisible letter)"],
    ["E0041", "tag character (invisible text)"],
  ])("fails on U+%s (%s) and says where it is", (hex, name) => {
    const { file, exitCode, output } = check(
      `first line\nab${char(parseInt(hex, 16))}cd\n`,
    );
    expect(output).toContain(`${file}:2:3  U+${hex} ${name}`);
    expect(exitCode).toBe(1);
  });

  it("asks to re-save a file that starts with a byte order mark", () => {
    const { file, exitCode, output } = check(`${char(0xfeff)}{}\n`);
    expect(output).toContain(
      `${file}:1:1  U+FEFF byte order mark (BOM): re-save the file as UTF-8 without BOM`,
    );
    expect(exitCode).toBe(1);
  });

  it("counts columns like VS Code, with Windows line endings", () => {
    // The emoji takes 2 columns, so the no-break space is in column 5.
    const { file, output } = check(`first\r\n👍 x${char(0xa0)}\r\n`);
    expect(output).toContain(`${file}:2:5  U+00A0 no-break space`);
  });

  it("flags a zero-width joiner that isn't between two emoji", () => {
    const { file, output } = check(`a${char(0x200d)}b 👍${char(0x200d)}`);
    expect(output).toContain(`${file}:1:2  U+200D zero-width joiner`);
    expect(output).toContain(`${file}:1:7  U+200D zero-width joiner`);
  });

  it("reports every character in every file", () => {
    const first = tempFile(`${char(0xa0)} and ${char(0x200b)}`);
    const second = tempFile(`fine\n${char(0x3000)}`);

    const { exitCode, output } = run(first, second);
    expect(output).toContain(`${first}:1:1  U+00A0 no-break space`);
    expect(output).toContain(`${first}:1:7  U+200B zero-width space`);
    expect(output).toContain(`${second}:2:1  U+3000 ideographic`);
    expect(output).toContain("3 raw invisible or unusual-space characters");
    expect(exitCode).toBe(1);
  });

  it("skips binary files", () => {
    // A NUL byte (so the file counts as binary), then a no-break space.
    const { exitCode, output } = check(
      Buffer.concat([Buffer.from([0]), Buffer.from(char(0xa0))]),
    );
    expect(output).toContain("check-invisible-chars: 0 files OK.");
    expect(exitCode).toBe(0);
  });

  it("skips the files on its skip list", () => {
    // 0010 has raw characters, but it's already applied (see SKIPPED_FILES).
    const migration = path.join(
      ROOT,
      "supabase/migrations/0010_require_verified_landlord_for_new_listings.sql",
    );
    expect(readFileSync(migration, "utf8")).toContain(char(0xa0));

    const { exitCode, output } = run(migration);
    expect(output).toContain("check-invisible-chars: 0 files OK.");
    expect(exitCode).toBe(0);
  });
});
