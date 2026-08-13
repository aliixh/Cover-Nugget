// Post-polish fact guard (Tier 2 safety net).
//
// The on-device model POLISHES the deterministic skeleton, but a small model can
// still mangle a hard fact: drop a metric ("5M requests" -> "hundreds of
// thousands") or invent one ("4k to 22k" -> "grew by 22%"). Those are exactly
// the errors the "accuracy is owned by code" principle must not allow.
//
// This module extracts the SIGNIFICANT numbers from the skeleton (the source of
// truth) and the polished output, and reports whether the model invented a
// number that isn't in the skeleton, or dropped one the skeleton had. The caller
// (services/coverLetter.ts) falls back to the skeleton when the guard trips.
//
// Scope: numbers with a unit (%, k, m, b, x) or values >= 100 — the high-signal,
// low-false-positive set. Natural paraphrase ("5M" <-> "five million", "six
// patients") is intentionally NOT flagged.

const UNIT: Record<string, string> = {
  "%": "%", percent: "%",
  k: "k", thousand: "k",
  m: "m", mn: "m", million: "m",
  b: "b", billion: "b",
  x: "x",
};

const WORD: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

// Numeric multiplier for scale words/suffixes, so "180k" == "180,000" and
// "5M" == "5 million" == "5,000,000" all canonicalize to the same value.
const SCALE: Record<string, number> = { hundred: 100, thousand: 1e3, k: 1e3, million: 1e6, m: 1e6, mn: 1e6, billion: 1e9, b: 1e9 };

/** Canonicalize one number to "value" (bare, with k/m/b expanded) or "value%"/"valuex". */
function token(value: number, unit: string): string {
  if (unit in SCALE) {
    value *= SCALE[unit];
    unit = "";
  }
  const v = Number.isInteger(value) ? String(value) : String(+value.toFixed(2));
  return v + unit; // unit is now only "", "%", or "x"
}

/** True when a token counts as "significant" (has %/x, or is >= 100 once scaled). */
function significant(tok: string): boolean {
  const m = tok.match(/^(\d+(?:\.\d+)?)(%|x)?$/);
  if (!m) return false;
  return !!m[2] || parseFloat(m[1]) >= 100;
}

/** Extract the set of significant number tokens from a piece of text. */
export function significantNumbers(text: string): Set<string> {
  const out = new Set<string>();
  const t = (text || "").toLowerCase();

  // word compounds: "five million", "twenty thousand", "three hundred"
  const wordRe = new RegExp(
    `\\b(${Object.keys(WORD).join("|")})\\s+(hundred|thousand|million|billion)\\b`,
    "g"
  );
  for (const m of t.matchAll(wordRe)) {
    const tok = token(WORD[m[1]], m[2]); // token() expands the scale word
    if (significant(tok)) out.add(tok);
  }

  // spelled-out percentages: "ten percent", "twenty-five percent", "ninety-nine percent".
  // A faithful polish often turns "10%" into "ten percent"; treat them as equal.
  const tens = "twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety";
  const ones = "one|two|three|four|five|six|seven|eight|nine";
  const small = Object.keys(WORD).join("|");
  const pctRe = new RegExp(`\\b((?:${tens})(?:[- ](?:${ones}))?|${small})\\s+percent\\b`, "g");
  for (const m of t.matchAll(pctRe)) {
    const parts = m[1].toLowerCase().replace(/-/g, " ").split(/\s+/);
    const value = parts.length === 2 ? (WORD[parts[0]] ?? 0) + (WORD[parts[1]] ?? 0) : WORD[parts[0]] ?? 0;
    if (value) out.add(token(value, "%"));
  }

  const push = (valStr: string, unitKey?: string) => {
    const value = parseFloat(valStr.replace(/,/g, ""));
    if (Number.isNaN(value)) return;
    const tok = token(value, unitKey ? UNIT[unitKey] ?? "" : "");
    if (significant(tok)) out.add(tok);
  };

  // NB: (?<![A-Za-z]) keeps us from reading the "2b" out of "B2B", "v2", etc.
  // digits with an ATTACHED single-letter unit (boundary after): "5m", "22k", "3x"
  for (const m of t.matchAll(/(?<![A-Za-z])(\d[\d,]*(?:\.\d+)?)(k|mn|m|b|x)\b/g)) push(m[1], m[2]);
  // digits + percent, attached or spaced: "40%", "40 percent"
  for (const m of t.matchAll(/(?<![A-Za-z])(\d[\d,]*(?:\.\d+)?)\s*(?:%|percent\b)/g)) push(m[1], "%");
  // digits + a spaced word unit: "5 million", "22 thousand"
  for (const m of t.matchAll(/(?<![A-Za-z])(\d[\d,]*(?:\.\d+)?)\s+(thousand|million|billion)\b/g)) push(m[1], m[2]);
  // bare numbers >= 100 (no unit): "300", "5,000"
  for (const m of t.matchAll(/(?<![A-Za-z])\b(\d[\d,]*(?:\.\d+)?)\b/g)) {
    const value = parseFloat(m[1].replace(/,/g, ""));
    if (!Number.isNaN(value) && value >= 100) out.add(token(value, ""));
  }
  return out;
}

export interface FactCheck {
  ok: boolean;
  /** Numbers present in the output but not in the skeleton (invented/changed). */
  invented: string[];
  /** Significant numbers in the skeleton missing from the output (dropped). */
  dropped: string[];
}

/**
 * Compare polished output against the skeleton. Fails when the model invented a
 * significant number or dropped one the skeleton stated.
 */
export function checkFacts(skeleton: string, output: string): FactCheck {
  const src = significantNumbers(skeleton);
  const out = significantNumbers(output);
  const invented = [...out].filter((n) => !src.has(n));
  const dropped = [...src].filter((n) => !out.has(n));
  return { ok: invented.length === 0 && dropped.length === 0, invented, dropped };
}

function hasWord(text: string, term: string): boolean {
  const t = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${t}\\b`, "i").test(text);
}

/**
 * Employment-status guard. When the top role has ended (`isCurrent === false`),
 * the letter must not claim present-tense employment there. The model likes to
 * turn "most recently I worked" into "I currently work", which misstates status.
 */
export function claimsCurrentlyEmployed(output: string, topRole?: { isCurrent?: boolean } | null): boolean {
  if (!topRole || topRole.isCurrent !== false) return false; // current/unknown -> "currently" is fine
  // "currently"/"presently"/"now" within a short span of work/employ (skips "currently pursuing")
  return /\b(currently|presently|right now)\b[^.]{0,30}\b(work|working|employed|employ)\b/i.test(output);
}

// Tools/frameworks/platforms — unambiguous names (no bare languages like "go"/"c",
// which would false-positive on ordinary words). Used to catch invented skills.
const TECH = (
  "docker kubernetes tensorflow pytorch keras react angular vue svelte django flask fastapi " +
  "spring express kafka spark hadoop airflow redis mongodb postgresql postgres mysql sqlite " +
  "elasticsearch terraform ansible jenkins graphql grpc tableau powerbi figma sketch jira " +
  "confluence salesforce snowflake databricks azure firebase heroku cuda opencv pandas numpy " +
  "scikit-learn sklearn huggingface langchain kotlin swift rust scala"
).split(" ");

/**
 * Invented-tool guard. Returns tech/tool names that appear in the letter but in
 * NEITHER the profile NOR the job description (allowedText) — i.e. fabricated
 * skills the candidate never listed.
 */
export function inventedTech(output: string, allowedText: string): string[] {
  return TECH.filter((t) => hasWord(output, t) && !hasWord(allowedText, t));
}
