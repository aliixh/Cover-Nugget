// Turns work-experience dates into recency + tenure phrasing the letter can use
// ("I currently work at…", "Most recently…", "for about two years"). All
// deterministic - the model is only told the facts, it doesn't compute them.

import type { Experience } from "../types/models";

interface YM {
  y: number;
  m: number; // 1–12
}

const MONTHS3 = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function clampMonth(n: number): number {
  return Math.min(12, Math.max(1, n));
}

/** Parse "MM/YYYY", "YYYY-MM", "Jun 2022", or "2022" into {y,m}. */
export function parseYM(s?: string | null): YM | null {
  if (!s) return null;
  const t = s.trim();
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(\d{1,2})\s*[/\-.]\s*(\d{4})$/))) return { m: clampMonth(+m[1]), y: +m[2] };
  if ((m = t.match(/^(\d{4})\s*[/\-.]\s*(\d{1,2})$/))) return { y: +m[1], m: clampMonth(+m[2]) };
  if ((m = t.match(/^([A-Za-z]{3,})\.?\s+(\d{4})$/))) {
    const i = MONTHS3.indexOf(m[1].slice(0, 3).toLowerCase());
    if (i >= 0) return { y: +m[2], m: i + 1 };
  }
  if ((m = t.match(/^(\d{4})$/))) return { y: +m[1], m: 6 };
  return null;
}

function ymNow(): YM {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

function monthsBetween(a: YM, b: YM): number {
  return (b.y - a.y) * 12 + (b.m - a.m);
}

/** Friendly, rounded tenure - "for about 2 years", "for a year and a half",
 *  "for 8 months". Threshold: 4–8 months past a year reads as "and a half". */
export function tenurePhrase(months: number): string {
  if (months < 1) return "";
  if (months < 12) return `for ${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem <= 2) return `for about ${years} year${years === 1 ? "" : "s"}`;
  if (rem >= 10) return `for about ${years + 1} years`;
  if (rem >= 4 && rem <= 8)
    return years === 1 ? "for about a year and a half" : `for about ${years} and a half years`;
  return `for over ${years} year${years === 1 ? "" : "s"}`;
}

function dateRange(e: Experience): string {
  const s = (e.startDate ?? "").trim();
  const en = e.isCurrent ? "Present" : (e.endDate ?? "").trim();
  if (s || en) return [s, en].filter(Boolean).join(" – ");
  return (e.dates ?? "").trim();
}

export interface ExperienceInsight {
  /** Annotated experience lines for the profile summary (most recent first). */
  lines: string[];
  /** Guidance about the current / most-recent role for the letter. */
  recencyNote: string;
}

/** Ranks experiences by recency and produces summary lines + a recency note. */
export function describeExperiences(exps: Experience[]): ExperienceInsight {
  const now = ymNow();
  const meta = exps.map((e) => {
    const start = parseYM(e.startDate) ?? parseYM(e.dates ?? null);
    const end = e.isCurrent ? now : parseYM(e.endDate);
    const months = start ? monthsBetween(start, end ?? now) : null;
    const rank = e.isCurrent
      ? Number.MAX_SAFE_INTEGER
      : end
        ? end.y * 12 + end.m
        : start
          ? start.y * 12 + start.m
          : 0;
    return { e, months, rank };
  });
  meta.sort((a, b) => b.rank - a.rank);

  const lines = meta.map(({ e, months }) => {
    const head = [e.role, e.company].filter(Boolean).join(" at ");
    const when = dateRange(e);
    const ten = months != null ? tenurePhrase(months) : "";
    const flag = e.isCurrent ? " [CURRENT]" : "";
    return (
      `  - ${head}` +
      (when ? ` (${when})` : "") +
      (ten ? `, ${ten}` : "") +
      flag +
      (e.description ? `: ${e.description}` : "")
    );
  });

  let recencyNote = "";
  const top = meta[0]?.e;
  if (top && (top.company || top.role)) {
    const head = [top.role, top.company].filter(Boolean).join(" at ");
    const ten = meta[0].months != null ? tenurePhrase(meta[0].months).replace(/^for /, "") : "";
    recencyNote = top.isCurrent
      ? `The candidate CURRENTLY works as ${head}${ten ? ` (${ten})` : ""}. Write about it in the present tense (e.g. "I currently work at ...").`
      : `The candidate's MOST RECENT role was ${head}${ten ? ` (${ten})` : ""}. Write about it as recent/past (e.g. "Most recently, I ...").`;
  }
  return { lines, recencyNote };
}

/** A ready-made clause about the current/most-recent role, for the template:
 *  "I currently work as Frontend Engineer at Nimbus for about two years" or
 *  "Most recently, I worked as Frontend Engineer at Nimbus". */
export function currentOrRecentClause(exps: Experience[]): string {
  if (!exps.length) return "";
  const now = ymNow();
  const meta = exps
    .map((e) => {
      const start = parseYM(e.startDate) ?? parseYM(e.dates ?? null);
      const end = e.isCurrent ? now : parseYM(e.endDate);
      const months = start ? monthsBetween(start, end ?? now) : null;
      const rank = e.isCurrent
        ? Number.MAX_SAFE_INTEGER
        : end ? end.y * 12 + end.m : start ? start.y * 12 + start.m : 0;
      return { e, months, rank };
    })
    .sort((a, b) => b.rank - a.rank);
  const { e, months } = meta[0];
  const head = [e.role, e.company].filter(Boolean).join(" at ");
  if (!head) return "";
  if (e.isCurrent) {
    const ten = months != null ? " " + tenurePhrase(months) : "";
    return `I currently work as ${head}${ten}`;
  }
  // Past role: only mention duration when it's substantial (>= 1 year). A short
  // stint ("for 3 months") reads as a negative, so we leave it off.
  const ten = months != null && months >= 12 ? " " + tenurePhrase(months) : "";
  return `Most recently, I worked as ${head}${ten}`;
}
