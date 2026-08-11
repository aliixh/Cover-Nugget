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
  const achievement = (top?.description || top?.achievements || "").trim();

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
