// Deterministic keyword matching between the candidate profile and the job
// description - no model involved. A tiny LLM can't reliably decide which of
// your skills matter for a role, so the app does it: we tokenize both sides,
// drop filler ("stop") words, and surface the overlap (which, after removing
// stop words, is mostly the meaningful nouns / skills / verbs / proper nouns).
// The matched terms are fed to the prompt so the model writes about the RIGHT
// things.

import type { FullProfile } from "../types/models";

// Common English words + job-posting boilerplate that carry no signal.
const STOPWORDS = new Set(
  (
    "a an and are as at be by for from has have i in is it its of on or that the to " +
    "with you your we our us they their this these those will would can could should " +
    "about above after again all also am any because been before being below between " +
    "both but did do does doing down during each few further had he her here hers him " +
    "his how if into just me more most my no nor not now off once only other out over " +
    "own same she so some such than then there they're too under until up very was were " +
    "what when where which while who whom why " +
    // job-posting filler
    "experience experiences work working works role roles position positions job jobs " +
    "team teams company companies ability able strong years year including etc plus " +
    "candidate candidates applicant looking seeking join responsibilities requirements " +
    "qualifications preferred required must skills skill knowledge understanding good " +
    "great excellent proven demonstrated ideal opportunity opportunities help support " +
    "across using use used within well new including like across day days month months " +
    "please apply application applications benefits salary range full time part remote"
  ).split(/\s+/)
);

// Short tokens that are meaningful tech/skill acronyms (kept despite length < 3).
const SHORT_TECH = new Set(["ai", "ml", "js", "go", "ux", "ui", "qa", "hr", "bi", "c#", "c++", "r", "3d"]);

function normalize(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9+#]/g, "");
}

/** Meaningful keywords in a block of text (lowercased, stop words removed). */
export function extractKeywords(text: string): Set<string> {
  const set = new Set<string>();
  for (const raw of (text || "").split(/[^A-Za-z0-9+#]+/)) {
    const w = normalize(raw);
    if (!w) continue;
    if (STOPWORDS.has(w)) continue;
    if (w.length < 3 && !SHORT_TECH.has(w)) continue;
    set.add(w);
  }
  return set;
}

export interface KeywordMatch {
  /** Explicit profile skills that appear in the job description. */
  skills: string[];
  /** Other overlapping keywords (from experience/projects/education) in the JD. */
  keywords: string[];
}

/** Escapes a token for use inside a RegExp. */
function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&");
}

/** Matches the candidate's profile against the job text and returns the terms
 *  that actually overlap, ranked by how often they appear in the posting. */
export function matchProfileToJob(profile: FullProfile, jobText: string): KeywordMatch {
  const jobLower = (jobText || "").toLowerCase();
  const jobKw = extractKeywords(jobText);
  const freq = (k: string) => (jobLower.match(new RegExp(`\\b${esc(k)}`, "g")) || []).length;

  // 1) Explicit skills present in the JD (whole-phrase or token match).
  const skills = profile.skills.map((s) => s.skill.trim()).filter((s) => s.length > 1);
  const matchedSkills = skills.filter((s) => {
    const sl = s.toLowerCase();
    if (jobLower.includes(sl)) return true;
    return sl.split(/\s+/).some((tok) => jobKw.has(normalize(tok)));
  });
  matchedSkills.sort((a, b) => freq(b.toLowerCase()) - freq(a.toLowerCase()));

  // 2) Overlapping keywords from the rest of the profile (experience, projects,
  //    education, certs) - the shared nouns/verbs beyond the tagged skills.
  const profileText = [
    ...profile.experience.map((e) => `${e.role ?? ""} ${e.description ?? ""} ${e.achievements ?? ""}`),
    ...profile.projects.map((p) => `${p.name ?? ""} ${p.technologies ?? ""} ${p.description ?? ""}`),
    ...profile.education.map((e) => `${e.degree ?? ""} ${e.major ?? ""} ${e.coursework ?? ""}`),
    ...profile.certifications.map((c) => c.name ?? ""),
  ].join(" ");
  const profileKw = extractKeywords(profileText);

  const skillLower = new Set(matchedSkills.map((s) => s.toLowerCase()));
  const keywords = [...profileKw]
    .filter((k) => jobKw.has(k) && !skillLower.has(k))
    .sort((a, b) => freq(b) - freq(a))
    .slice(0, 12);

  return { skills: matchedSkills, keywords };
}
