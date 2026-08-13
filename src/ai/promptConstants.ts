// Shared prompt constants - kept in one dependency-free module so the on-device
// runtime (registerNative), the generation service (coverLetter), AND the
// fine-tuning data builder (training/) all use the EXACT same strings. If the
// model is trained on one framing and run on another, the LoRA won't transfer.

import { AVOID_LINE } from "./humanize";

/** System message sent with every model call (and used to build training data). */
export const SYSTEM =
  "You are a precise writing assistant for professional cover letters. Follow the instructions exactly and return only what is asked.";

/** The Tier-2 "polish" instruction: rewrite the grounded skeleton for flow and
 *  variation, but never change the facts. */
export const POLISH_INSTRUCTION =
  "Rewrite this cover letter so it reads smoothly and naturally: improve the flow " +
  "between sentences, vary the sentence structure, and make it sound genuinely human. " +
  "Keep EVERY fact exactly as written: do not add, remove, or change any names, " +
  "companies, roles, skills, dates, numbers, or achievements, and do not invent anything. " +
  AVOID_LINE;
