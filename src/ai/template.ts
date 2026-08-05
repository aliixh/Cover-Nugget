// Deterministic, non-AI cover-letter builder.
//
// Used as a FALLBACK when the on-device model isn't available (e.g. running in
// Expo Go / web, or before the user downloads the model). It lets the entire
// generate → edit → export flow work end-to-end without any model or GPU.
// The real AI provider (getAI().generate) is always tried first.
//
// Unlike a pure boilerplate letter, this DOES read the job description: it
// matches the candidate's skills against the posting and references the job's
// stated focus, so the draft is tailored (not just "your info").

import type { GenerateRequest } from "./types";
import type { Profile } from "../types/models";
import { matchProfileToJob } from "./keywordMatch";
import { currentOrRecentClause } from "../utils/experience";
import { composeBody, type Slots } from "./sentenceLibrary";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "July 31, 2026" */
function formatLetterDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * The standard letter header, built deterministically from the profile (the
 * model is never trusted with the applicant's real contact details):
 *
 *   Name
 *   Address / location
 *   Email · Phone · LinkedIn
 *   <blank>
 *   Date
 *
 * Lines with no data are skipped rather than faked. The letter body (greeting →
 * sign-off) is appended after this by the caller.
 */
export function buildLetterHeader(p: Profile): string {
  const lines: string[] = [];
  if (p.name?.trim()) lines.push(p.name.trim());
  if (p.location?.trim()) lines.push(p.location.trim());
  const contact = [p.email, p.phone, p.linkedin, p.portfolio]
    .map((s) => s?.trim())
    .filter((s): s is string => !!s);
  if (contact.length) lines.push(contact.join(" · "));
  return `${lines.join("\n")}\n\n${formatLetterDate(new Date())}`;
}

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
