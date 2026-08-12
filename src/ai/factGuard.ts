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

const SCALE: Record<string, { unit: string; mult: number }> = {
  hundred: { unit: "", mult: 100 },
  thousand: { unit: "k", mult: 1 },
  million: { unit: "m", mult: 1 },
  billion: { unit: "b", mult: 1 },
};

/** Canonicalize one number to a "value+unit" token, e.g. "5m", "40%", "300". */
function token(value: number, unit: string): string {
  // trim floating noise
  const v = Number.isInteger(value) ? String(value) : String(+value.toFixed(2));
  return v + unit;
}

/** True when a token counts as "significant" (has a unit, or is >= 100). */
function significant(tok: string): boolean {
  const m = tok.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return false;
  const val = parseFloat(m[1]);
  const unit = m[2];
  return unit !== "" || val >= 100;
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
    const base = WORD[m[1]];
    const sc = SCALE[m[2]];
    const tok = token(base * sc.mult, sc.unit);
    if (significant(tok)) out.add(tok);
  }

  const push = (valStr: string, unitKey?: string) => {
    const value = parseFloat(valStr.replace(/,/g, ""));
    if (Number.isNaN(value)) return;
    const tok = token(value, unitKey ? UNIT[unitKey] ?? "" : "");
    if (significant(tok)) out.add(tok);
  };

  // digits with an ATTACHED single-letter unit (boundary after): "5m", "22k", "3x"
  for (const m of t.matchAll(/(\d[\d,]*(?:\.\d+)?)(k|mn|m|b|x)\b/g)) push(m[1], m[2]);
  // digits + percent, attached or spaced: "40%", "40 percent"
  for (const m of t.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(?:%|percent\b)/g)) push(m[1], "%");
  // digits + a spaced word unit: "5 million", "22 thousand"
  for (const m of t.matchAll(/(\d[\d,]*(?:\.\d+)?)\s+(thousand|million|billion)\b/g)) push(m[1], m[2]);
  // bare numbers >= 100 (no unit): "300", "5,000"
  for (const m of t.matchAll(/\b(\d[\d,]*(?:\.\d+)?)\b/g)) {
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
