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

/** Pull one short phrase describing what the posting emphasizes. */
function firstRequirement(desc: string): string | null {
  const lines = desc
    .split(/\r?\n|•|;|\.|\-\s/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 12 && l.length <= 90);
  const cue =
    /(experience (?:with|in)|proficien|knowledge of|ability to|familiar(?:ity)? with|responsible for|skills? in|background in)/i;
  const hit = lines.find((l) => cue.test(l));
  if (!hit) return null;
  return hit.replace(/^[^a-zA-Z]*/, "").replace(/[,:;]+$/, "");
}

/** Builds a clean, structured letter from the profile + job. */
export function buildTemplateLetter(req: GenerateRequest): string {
  const { profile } = req.profile;
  const { experience, skills, education } = req.profile;
  const job = req.job;

  const jobText = (job.description || "").trim();
  const jobLower = jobText.toLowerCase();

  const role = job.role?.trim() || extractRole(jobText) || "the open role";
  const company = job.company?.trim() || "your company";

  // Only surface skills the posting actually mentions — so unrelated ones the
  // user happens to have listed (e.g. a joke "dino" skill) never get forced in.
  // If the job text is empty (rare), fall back to the candidate's own skills.
  const allSkills = skills.map((s) => s.skill).filter((s) => s.trim().length > 1);
  const matchedSkills = allSkills.filter((s) => jobLower.includes(s.toLowerCase()));
  const skillList = (jobLower ? matchedSkills : allSkills).slice(0, 6);

  const topExperience = experience[0];
  const topEducation = education[0];

  const opener = `Dear Hiring Manager,`;

  const intro =
    `I am excited to apply for ${role} at ${company}. ` +
    `With my background${topExperience?.role ? ` as ${topExperience.role}` : ""}${
      topExperience?.company ? ` at ${topExperience.company}` : ""
    }, I believe I can make a meaningful contribution to your team.`;

  const bodyBits: string[] = [];

  // Tie the letter directly to the posting.
  if (matchedSkills.length) {
    bodyBits.push(
      `Your posting calls for ${andList(matchedSkills.slice(0, 4))}, which are central to my experience.`
    );
  }
  const requirement = firstRequirement(jobText);
  if (requirement) {
    bodyBits.push(`I was especially drawn to your emphasis on ${requirement}.`);
  }

  if (topExperience?.description) bodyBits.push(topExperience.description.trim());
  if (topExperience?.achievements) bodyBits.push(topExperience.achievements.trim());
  if (skillList.length) {
    bodyBits.push(
      `My core strengths include ${andList(skillList)}, which align well with what this role requires.`
    );
  }
  if (topEducation?.degree || topEducation?.school) {
    bodyBits.push(
      `I hold ${[topEducation.degree, topEducation.school].filter(Boolean).join(" from ")}.`
    );
  }
  const body = bodyBits.join(" ");

  const closing =
    `I would welcome the chance to discuss how my experience can support ${company}'s goals. ` +
    `Thank you for your time and consideration.`;

  const signOff = `Sincerely,\n${profile.name}`;

  return [opener, "", intro, "", body, "", closing, "", signOff].join("\n");
}
