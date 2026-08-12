// Deterministic, non-AI cover-letter builder (Tier 1 of the hybrid flow).
//
// Assembles an accurate, VARIED skeleton from the sentence-structure library
// (sentenceLibrary.ts), filled from the real profile + matched job keywords +
// recency. The on-device model then POLISHES this skeleton for flow
// (services/coverLetter.ts). When no model is available (Expo Go / web / not
// downloaded), the skeleton is used as-is, so the whole flow works with no GPU.

import type { GenerateRequest } from "./types";
import { matchProfileToJob } from "./keywordMatch";
import { currentOrRecentClause } from "../utils/experience";
import { composeBody, type Slots } from "./sentenceLibrary";

/** "a, b and c" */
function andList(items: string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length <= 1) return xs.join("");
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** Try to read an explicit role/title line out of the job text. */
function extractRole(desc: string): string | null {
  const m = desc.match(/(?:role|position|job title|title)\s*[:\-]\s*(.{2,60})/i);
  return m ? m[1].split(/[\n.]/)[0].trim() : null;
}

// Users write the "What you did" field in whatever voice they like, often third
// person ("Supports a $120M portfolio; built the forecasting model..."). Dropped
// verbatim into a first-person letter that reads wrong, so we normalize it.
const PAST_VERBS = new Set(
  ("built led managed improved cut raised reduced grew delivered redesigned helped " +
   "developed created launched drove ran oversaw coordinated designed provided handled " +
   "treated taught wrote owned increased decreased saved won closed shipped migrated " +
   "automated mentored trained supported ran maintained").split(" ")
);

function deconjugate(w: string): string {
  if (/ies$/.test(w)) return w.slice(0, -3) + "y"; // carries -> carry
  if (/(ss|sh|ch|x|z|o)es$/.test(w)) return w.slice(0, -2); // teaches -> teach
  if (/s$/.test(w)) return w.slice(0, -1); // supports -> support
  return w;
}

// Common resume action verbs (base form). Coordinate verbs are only de-conjugated
// when they're in this set, so plural nouns ("reports", "systems") are left alone.
const VERB_SET = new Set(
  ("build maintain resolve manage lead run own design provide coordinate oversee handle " +
   "support develop create deliver improve drive mentor train treat teach write ship launch " +
   "analyze prepare process review plan organize monitor negotiate forecast present streamline " +
   "reduce raise cut grow increase serve counsel operate").split(" ")
);

/** Turn a third-person "What you did" blurb into a first-person clause. Leaves
 *  text that doesn't start with a verb (or is already first person) untouched. */
function toFirstPerson(desc: string): string {
  let d = (desc || "").trim();
  if (!d) return d;
  if (/^(I|We|My|Our)\b/.test(d)) return d;
  d = d.replace(/;\s*/g, ", "); // clause separator -> comma for flow
  const m = d.match(/^([A-Za-z]+)([\s\S]*)$/);
  if (!m) return d;
  const lw = m[1].toLowerCase();
  const present3rd = /s$/.test(lw) && !/(ss|us|is)$/.test(lw);
  if (!present3rd && !PAST_VERBS.has(lw)) return d; // not a leading verb -> leave alone
  const verb = present3rd ? deconjugate(lw) : lw;
  // de-conjugate later coordinate verbs ("...and resolves", ", manages...") when
  // they're recognizably verbs, so the whole first-person clause stays consistent.
  const rest = m[2].replace(/(\band\s+|,\s+)([a-z]+)\b/gi, (whole, conj, w) => {
    const base = deconjugate(w.toLowerCase());
    return /s$/.test(w) && VERB_SET.has(base) ? conj + base : whole;
  });
  return `I ${verb}${rest}`;
}

/** Extracts the slots for the sentence library from the profile + job. */
function buildSlots(req: GenerateRequest): Slots {
  const { profile } = req.profile;
  const { experience, skills, education } = req.profile;
  const job = req.job;

  const jobText = (job.description || "").trim();
  const jobLower = jobText.toLowerCase();

  const role = job.role?.trim() || extractRole(jobText) || "the open role";
  const company = job.company?.trim() || "your company";

  const allSkills = skills.map((s) => s.skill).filter((s) => s.trim().length > 1);
  const matched = jobLower ? matchProfileToJob(req.profile, jobText).skills : allSkills;
  const topSkills = andList((matched.length ? matched : allSkills).slice(0, 3));

  const top = experience[0];
  const achievement = toFirstPerson((top?.description || top?.achievements || "").trim());

  const edu = education[0];
  const degree = edu
    ? `${edu.degree || "a degree"}${edu.school ? ` from ${edu.school}` : ""}`
    : "";

  return {
    name: profile.name,
    role,
    company,
    matched,
    topSkills,
    recentClause: currentOrRecentClause(experience),
    achievement,
    degree,
  };
}

/** Builds a clean, structured, VARIED letter from the profile + job using the
 *  sentence-structure library. The model then polishes this for flow. */
export function buildTemplateLetter(req: GenerateRequest): string {
  const slots = buildSlots(req);
  const body = composeBody(slots);
  return `Dear Hiring Manager,\n\n${body}\n\nSincerely,\n${slots.name}`;
}
