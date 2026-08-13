// Job-match insight: how well the user's profile covers a posting's key terms.
//
// Reuses the same keyword extraction the letter generator uses (keywordMatch.ts)
// so "match" here means exactly the terms the letter can actually center on. The
// UI shows the score + the important terms the profile is MISSING, so the user
// can strengthen their profile (or letter) before applying.

import type { FullProfile } from "../types/models";
import { extractKeywords } from "./keywordMatch";

export interface JobMatch {
  /** 0..1 fraction of the posting's key terms present in the profile. */
  score: number;
  /** Key JD terms the profile already covers. */
  covered: string[];
  /** Important JD terms the profile is missing (top few). */
  missing: string[];
  /** How many key terms we scored against. */
  total: number;
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&");
}

// Generic posting filler that isn't a real skill/requirement — dropped so the
// "missing" list shows things worth adding, not noise like "need"/"strong".
const FILLER = new Set(
  ("need needs strong looking want wants must matter matters plus ideal candidate " +
   "responsibilities requirements qualifications role position join help support " +
   "opportunity across including etc within around ability able great good excellent " +
   "day days week weeks month months apply application applicant preferred required").split(" ")
);

/** Score the profile against a job posting and surface the gaps. */
export function jobMatchInsight(profile: FullProfile, jobText: string): JobMatch {
  const jt = (jobText || "").trim();
  if (jt.length < 20) return { score: 0, covered: [], missing: [], total: 0 };

  const lower = jt.toLowerCase();
  const freq = (k: string) => (lower.match(new RegExp(`\\b${esc(k)}`, "g")) || []).length;
  // The posting's most-repeated meaningful terms are the ones that matter.
  const important = [...extractKeywords(jt)]
    .filter((k) => !FILLER.has(k))
    .sort((a, b) => freq(b) - freq(a))
    .slice(0, 15);

  const profileText = [
    profile.skills.map((s) => s.skill).join(" "),
    ...profile.experience.map((e) => `${e.role ?? ""} ${e.description ?? ""} ${e.achievements ?? ""}`),
    ...profile.projects.map((p) => `${p.name ?? ""} ${p.technologies ?? ""} ${p.description ?? ""}`),
    ...profile.education.map((e) => `${e.degree ?? ""} ${e.major ?? ""} ${e.coursework ?? ""}`),
    ...profile.certifications.map((c) => c.name ?? ""),
  ].join(" ").toLowerCase();

  const covered = important.filter((t) => new RegExp(`\\b${esc(t)}`).test(profileText));
  const missing = important.filter((t) => !covered.includes(t)).slice(0, 8);
  return { score: important.length ? covered.length / important.length : 0, covered, missing, total: important.length };
}
