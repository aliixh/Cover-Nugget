// AI module contract (kept separate so a real model can be dropped in later
// — Qwen3.5-0.8B in Phase 4 — without touching the UI).
//
// IMPORTANT: nothing here runs a model. These are pure types + a provider
// interface. No GPU usage anywhere in the app.

import type { FullProfile } from "../types/models";

/** Job info the user supplied (pasted description or link-derived text). */
export interface JobInput {
  company?: string;
  role?: string;
  /** Cleaned, full job description text. */
  description: string;
}

/** Everything the model needs to draft a letter. */
export interface GenerateRequest {
  profile: FullProfile;
  job: JobInput;
  /** Permanent user instructions from Settings. */
  instructions: string[];
}

/** A highlight-based edit on a selected span (spec §8). */
export type SelectionAction =
  | "shorten"
  | "less-formal"
  | "more-formal"
  | "more-confident"
  | "simplify"
  | "fix-grammar"
  | "remove"
  | "custom";

export interface EditSelectionRequest {
  fullText: string;
  selectedText: string;
  action: SelectionAction;
  /** Free-form instruction when action === "custom". */
  customInstruction?: string;
  instructions: string[];
}

/** A whole-letter rewrite (spec §10). */
export interface EditWholeRequest {
  fullText: string;
  instruction: string;
  instructions: string[];
}

/**
 * The seam every AI backend implements. Phase 3/4 will provide a concrete
 * implementation (local Qwen). Until then, `NotImplementedProvider` is used.
 */
export interface CoverLetterAI {
  generate(req: GenerateRequest): Promise<string>;
  editSelection(req: EditSelectionRequest): Promise<string>;
  editWhole(req: EditWholeRequest): Promise<string>;
}
