// High-level cover-letter service used by the screens.
//
// It assembles the inputs (full profile + permanent AI instructions), calls the
// active AI provider, and — for generation — falls back to a local template
// when the model isn't available, so the flow always works. Editing actions
// require the model; when it's unavailable they throw a clear message for the
// UI to show.

import { getAI } from "../ai";
import { buildTemplateLetter } from "../ai/template";
import { applyLetterFormat } from "./letterFormat";
import { stripDashes } from "../ai/humanize";
import { POLISH_INSTRUCTION } from "../ai/promptConstants";
import type { JobInput, SelectionAction } from "../ai/types";
import { getFullProfile, listAiSettings } from "../db/repositories";
import { withinLimit, type LengthLimit } from "../utils/textStats";

async function loadInstructions(): Promise<string[]> {
  const settings = await listAiSettings();
  return settings.map((s) => s.instruction);
}

export interface GenerateResult {
  content: string;
  /** True when the local template was used because AI wasn't available. */
  usedFallback: boolean;
}

/**
 * Generate a first draft with the hybrid, tiered approach:
 *   Tier 1 — build an accurate, VARIED skeleton from the sentence-structure
 *            library (grounded in the real profile + matched job keywords).
 *   Tier 2 — the on-device model POLISHES that skeleton for flow/variation,
 *            keeping every fact. Falls back to the skeleton when no model is
 *            available (Expo Go / not downloaded).
 */
export async function generateLetter(job: JobInput): Promise<GenerateResult> {
  const profile = await getFullProfile();
  if (!profile) throw new Error("No profile found. Complete onboarding first.");
  const instructions = await loadInstructions();
  const req = { profile, job, instructions };

  // Rebuilds the contact header / date / sign-off from the profile (so the model
  // can never fake contact details) and applies the chosen layout.
  const format = (body: string) =>
    applyLetterFormat(body, 0, profile.profile, job.company, job.role);

  // Tier 1: accurate, varied skeleton (dashes stripped for a human feel).
  const skeleton = stripDashes(buildTemplateLetter(req));

  // Tier 2: model polishes it (facts preserved).
  try {
    const polished = await getAI().editWhole({
      fullText: skeleton,
      instruction: POLISH_INSTRUCTION,
      instructions,
    });
    return { content: format(stripDashes(polished)), usedFallback: false };
  } catch {
    return { content: format(skeleton), usedFallback: true };
  }
}

/**
 * Rewrite a highlighted selection. Returns the REPLACEMENT text for the
 * selection only (the editor splices it back in by index). `remove` needs no
 * model and returns an empty string.
 */
export async function editSelection(
  fullText: string,
  selectedText: string,
  action: SelectionAction,
  customInstruction?: string
): Promise<string> {
  if (action === "remove") return "";
  const instructions = await loadInstructions();
  const out = await getAI().editSelection({
    fullText,
    selectedText,
    action,
    customInstruction,
    instructions,
  });
  return stripDashes(out);
}

/** Apply a whole-letter rewrite instruction. */
export async function editWholeLetter(
  fullText: string,
  instruction: string
): Promise<string> {
  const instructions = await loadInstructions();
  return stripDashes(await getAI().editWhole({ fullText, instruction, instructions }));
}

/**
 * Shorten the letter until it fits `limit`, measured by OUR counter (the model
 * can't count reliably). Runs up to 3 model passes; the user only ever sees the
 * final, within-limit result. Throws if the model isn't available (caller shows
 * a message) — length is still displayed via the counter regardless.
 */
export interface FitOptions {
  /** Max shortening passes (default 4). */
  maxPasses?: number;
  /** Called before each pass with the 1-based pass number. */
  onPass?: (pass: number, maxPasses: number) => void;
  /** Return true to stop before the next pass. */
  shouldCancel?: () => boolean;
}

export async function fitToLength(
  text: string,
  limit: LengthLimit | null,
  opts: FitOptions = {}
): Promise<string> {
  if (withinLimit(text, limit)) return text;
  const maxPasses = opts.maxPasses ?? 4;
  const instructions = await loadInstructions();
  const unit = limit!.type === "word" ? "words" : "characters";
  let current = text;
  for (let i = 0; i < maxPasses; i++) {
    if (withinLimit(current, limit)) break;
    if (opts.shouldCancel?.()) break;
    opts.onPass?.(i + 1, maxPasses);
    current = (
      await getAI().editWhole({
        fullText: current,
        instruction: `Rewrite this cover letter to be at most ${limit!.value} ${unit}. Keep it complete, natural, and professional — do not cut off mid-sentence.`,
        instructions,
      })
    ).trim();
  }
  return current;
}
