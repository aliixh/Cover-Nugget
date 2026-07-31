// Pure prompt-building helpers. No model calls, no GPU — just string assembly
// that turns the local profile + job + settings into prompts. Keeping this
// pure makes it easy to unit-test and to reuse across any backend.

import type {
  EditSelectionRequest,
  EditWholeRequest,
  GenerateRequest,
  SelectionAction,
} from "./types";

// Human-readable phrasing for each highlight action (spec §8).
const ACTION_PHRASING: Record<SelectionAction, string> = {
  shorten: "Make this shorter while keeping the meaning.",
  expand: "Expand this with a little more relevant detail — no filler or padding.",
  "less-formal": "Rewrite this to be less formal.",
  "more-formal": "Rewrite this to be more formal.",
  "more-confident": "Rewrite this to sound more confident.",
  "more-playful": "Rewrite this in a more playful, light-hearted tone.",
  "more-sincere": "Rewrite this to sound more sincere and heartfelt.",
  "more-personal": "Rewrite this to feel more personal and specific to me.",
  "more-grateful": "Rewrite this to sound more appreciative and grateful.",
  "more-enthusiastic": "Rewrite this to sound more enthusiastic.",
  simplify: "Simplify this so it is easier to read.",
  "change-structure": "Restructure this — change the sentence structure while keeping the meaning.",
  rephrase: "Rephrase this using different wording while keeping the meaning.",
  "active-voice": "Rewrite this in active voice.",
  "fix-grammar": "Fix any grammar and spelling issues.",
  remove: "Remove this text.",
  custom: "", // provided by the user
};

/** Joins the user's permanent instructions into a prompt block. */
function instructionBlock(instructions: string[]): string {
  if (instructions.length === 0) return "";
  const lines = instructions.map((i) => `- ${i}`).join("\n");
  return `\nAlways follow these user rules:\n${lines}\n`;
}

/** Condenses the full profile into a compact, model-friendly summary. */
export function buildProfileSummary(req: GenerateRequest): string {
  const { profile: p, education, experience, projects, skills, certifications, volunteer } =
    req.profile;
  const parts: string[] = [];

  parts.push(`Name: ${p.name}`);
  if (p.location) parts.push(`Location: ${p.location}`);

  if (education.length) {
    parts.push(
      "Education:\n" +
        education
          .map((e) => `  - ${[e.degree, e.school, e.graduationYear].filter(Boolean).join(", ")}`)
          .join("\n")
    );
  }
  if (experience.length) {
    parts.push(
      "Experience:\n" +
        experience
          .map(
            (e) =>
              `  - ${[e.role, e.company, e.dates].filter(Boolean).join(", ")}` +
              (e.description ? `: ${e.description}` : "") +
              (e.achievements ? ` (${e.achievements})` : "")
          )
          .join("\n")
    );
  }
  if (projects.length) {
    parts.push(
      "Projects:\n" +
        projects
          .map((pr) => `  - ${pr.name}${pr.technologies ? ` [${pr.technologies}]` : ""}${pr.description ? `: ${pr.description}` : ""}`)
          .join("\n")
    );
  }
  if (volunteer.length) {
    parts.push(
      "Volunteer:\n" +
        volunteer.map((v) => `  - ${[v.role, v.organization].filter(Boolean).join(", ")}`).join("\n")
    );
  }
  if (skills.length) parts.push(`Skills: ${skills.map((s) => s.skill).join(", ")}`);
  if (certifications.length)
    parts.push(`Certifications: ${certifications.map((c) => c.name).join(", ")}`);

  return parts.join("\n");
}

/**
 * Cap the job description so the whole prompt fits the on-device model's
 * context. Postings front-load the important parts (role + requirements), so
 * the head is what matters.
 */
function capDescription(d: string, maxChars = 4000): string {
  const t = (d || "").trim();
  return t.length > maxChars ? t.slice(0, maxChars) + "\n…(truncated)" : t;
}

/** Full generation prompt (spec §6). */
export function buildGeneratePrompt(req: GenerateRequest): string {
  const job = req.job;
  return [
    "Write a professional, personalized cover letter for the job below.",
    "Base it on the job description: only include the candidate's experience,",
    "skills, and details that are RELEVANT to this specific role. Do NOT mention",
    "unrelated skills or padding just because they appear in the profile.",
    "",
    "Format the body as follows (unless a user rule below overrides it):",
    "- First line: the greeting \"Dear Hiring Manager,\"",
    "- Then 2-4 short paragraphs, each separated by a blank line.",
    "- Finally a sign-off line \"Sincerely,\" followed by the candidate's name.",
    "- Do NOT add the candidate's name, address, contact info, or the date at the",
    "  top — the header is added automatically, so begin with the greeting.",
    instructionBlock(req.instructions),
    "\nCandidate profile:",
    buildProfileSummary(req),
    "\nJob details:",
    job.company ? `Company: ${job.company}` : "",
    job.role ? `Role: ${job.role}` : "",
    `Description:\n${capDescription(job.description)}`,
    // Restate the user's rules right before generation — small models follow
    // instructions best when they're the last thing they read.
    req.instructions.length
      ? `\nBefore writing, re-read and strictly follow these rules:\n${req.instructions
          .map((i) => `- ${i}`)
          .join("\n")}`
      : "",
    "\nReturn only the cover letter text.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Highlight-edit prompt (spec §8) — the model rewrites only the selection. */
export function buildSelectionPrompt(req: EditSelectionRequest): string {
  const instruction =
    req.action === "custom" ? req.customInstruction ?? "" : ACTION_PHRASING[req.action];
  return [
    "You are editing part of a cover letter. Rewrite ONLY the selected text.",
    instructionBlock(req.instructions),
    `\nInstruction: ${instruction}`,
    `\nSelected text:\n${req.selectedText}`,
    "\nReturn only the rewritten selection.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Whole-letter rewrite prompt (spec §10). */
export function buildWholePrompt(req: EditWholeRequest): string {
  return [
    "Rewrite the entire cover letter according to the instruction.",
    instructionBlock(req.instructions),
    `\nInstruction: ${req.instruction}`,
    `\nCurrent letter:\n${req.fullText}`,
    "\nReturn only the rewritten letter.",
  ]
    .filter(Boolean)
    .join("\n");
}
