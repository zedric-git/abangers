export const STANDARD_HOUSE_RULES = [
  "Cooking Allowed",
  "Visitors Allowed",
  "Pets Allowed",
  "No Curfew",
  "Smoking Allowed",
] as const;

export type StandardHouseRule = (typeof STANDARD_HOUSE_RULES)[number];

export interface ParsedHouseRules {
  rules: string[];
  notes: string;
}

const ADDITIONAL_NOTES_DELIMITER_REGEX =
  /(?:\r?\n)*Additional (?:Guidelines & )?Notes:(?:\r?\n)*/i;

/**
 * Matches a line only when the entire trimmed line equals one of the five
 * standard house rules (case-insensitively), returning the canonical rule name.
 */
function matchExactStandardRule(line: string): StandardHouseRule | null {
  const trimmedLine = line.trim().toLowerCase();
  if (!trimmedLine) return null;

  for (const rule of STANDARD_HOUSE_RULES) {
    if (rule.toLowerCase() === trimmedLine) {
      return rule;
    }
  }
  return null;
}

/**
 * Splits lines into ticked standard rules (only when the whole line is
 * exactly one of the five rules) and remaining free-text notes.
 */
function extractExactLineRules(text: string): ParsedHouseRules {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rules: string[] = [];
  const noteLines: string[] = [];

  for (const line of lines) {
    const matched = matchExactStandardRule(line);
    if (matched) {
      if (!rules.includes(matched)) {
        rules.push(matched);
      }
    } else {
      noteLines.push(line);
    }
  }

  return {
    rules,
    notes: noteLines.join("\n"),
  };
}

/**
 * Parses raw house_rules string into standard rule checklist items and custom notes.
 *
 * Only counts a line as a ticked rule when the whole line is exactly one of
 * the five standard rules, and reads everything after the "Additional Notes:"
 * header as free-text notes, so phrases like "No smoking allowed" or
 * "Visitors allowed until 9 PM only" are never misread as ticked rules.
 */
export function parseHouseRules(
  raw: string | null | undefined,
): ParsedHouseRules {
  if (!raw || typeof raw !== "string") {
    return { rules: [], notes: "" };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { rules: [], notes: "" };
  }

  // Formatted with "Additional Notes:" header
  if (ADDITIONAL_NOTES_DELIMITER_REGEX.test(trimmed)) {
    const parts = trimmed.split(ADDITIONAL_NOTES_DELIMITER_REGEX);
    const rulesPart = parts[0] || "";
    const notesPart = parts.slice(1).join("\n").trim();

    const { rules, notes: leftoverFromRulesPart } =
      extractExactLineRules(rulesPart);
    const combinedNotes = [leftoverFromRulesPart, notesPart]
      .filter(Boolean)
      .join("\n");

    return { rules, notes: combinedNotes };
  }

  // Without header: only count a line as a ticked rule when the whole line
  // is exactly one of the five standard rules; any other line stays in notes.
  return extractExactLineRules(trimmed);
}

/**
 * Formats standard rules and custom notes into a single string for storage.
 * Always saves notes under the "Additional Notes:" header (even when no rule
 * is ticked), so free text is never read back as a rule.
 */
export function formatHouseRules(rules: string[], notes: string): string {
  const cleanRules = rules.map((r) => r.trim()).filter(Boolean);
  const cleanNotes = notes.trim();

  if (cleanRules.length === 0 && !cleanNotes) {
    return "";
  }

  if (cleanRules.length > 0 && cleanNotes) {
    return `${cleanRules.join("\n")}\n\nAdditional Notes:\n${cleanNotes}`;
  }

  if (cleanRules.length > 0) {
    return cleanRules.join("\n");
  }

  return `Additional Notes:\n${cleanNotes}`;
}
