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
 * Parses raw house_rules string into standard rule checklist items and custom notes.
 * Supports:
 * 1. Formatted string: "Cooking Allowed\nVisitors Allowed\n\nAdditional Notes:\npwede maka luto"
 * 2. Legacy concatenated string: "Pets Allowed, No Curfew, Visitors Allowed, Cooking Allowed pwede maka luto"
 * 3. Plain rules-only or custom-notes-only string.
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

  // Case 1: Formatted with "Additional Notes:" delimiter
  if (ADDITIONAL_NOTES_DELIMITER_REGEX.test(trimmed)) {
    const parts = trimmed.split(ADDITIONAL_NOTES_DELIMITER_REGEX);
    const rulesPart = parts[0] || "";
    const notesPart = parts.slice(1).join("\n").trim();

    const rules = rulesPart
      .split(/[\r\n,]+/)
      .map((r) => r.trim())
      .filter(Boolean);

    return { rules, notes: notesPart };
  }

  // Case 2: Check if string contains known standard rules
  const foundRules: string[] = [];
  let remainingText = trimmed;

  for (const rule of STANDARD_HOUSE_RULES) {
    const ruleRegex = new RegExp(`\\b${escapeRegExp(rule)}\\b`, "i");
    if (ruleRegex.test(remainingText)) {
      foundRules.push(rule);
      remainingText = remainingText.replace(ruleRegex, "");
    }
  }

  // Clean leftover commas, semicolons, dashes, and extra whitespace
  const cleanedNotes = remainingText
    .replace(/^[\s,;.-]+|[\s,;.-]+$/g, "")
    .replace(/[,;]\s*[,;]/g, ",")
    .replace(/^\s*[,;]\s*/, "")
    .trim();

  // If we found standard rules, return them alongside whatever custom text remained
  if (foundRules.length > 0) {
    return {
      rules: foundRules,
      notes: cleanedNotes,
    };
  }

  // Case 3: No standard rules found - if multiline, split by lines or treat as notes
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return {
      rules: lines,
      notes: "",
    };
  }

  return {
    rules: [],
    notes: trimmed,
  };
}

/**
 * Formats standard rules and custom notes into a single cohesive string for storage.
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

  return cleanNotes;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
