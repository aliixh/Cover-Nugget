// AI provider registry. The rest of the app imports `getAI()` and never needs
// to know which backend is active. Phase 3/4 swaps in a real local model here.
//
// No GPU, no network, no model weights are touched in Phase 1.

import type {
  CoverLetterAI,
  EditSelectionRequest,
  EditWholeRequest,
  GenerateRequest,
} from "./types";

export * from "./types";
export * from "./prompt";
export * from "./runtime";
export * from "./modelConfig";
export * from "./modelManager";
export { LocalLlamaProvider, ModelNotReadyError, RuntimeUnavailableError } from "./localProvider";
import { LocalLlamaProvider } from "./localProvider";

/**
 * Placeholder provider. It builds the correct prompts (so the seam is proven
 * end-to-end) but throws instead of returning text, because no model is wired
 * up yet. Screens should catch this and show a "coming soon" message.
 */
export class NotImplementedProvider implements CoverLetterAI {
  async generate(_req: GenerateRequest): Promise<string> {
    throw new Error("AI generation is not available yet (arrives in Phase 3).");
  }
  async editSelection(_req: EditSelectionRequest): Promise<string> {
    throw new Error("AI editing is not available yet (arrives in Phase 3).");
  }
  async editWhole(_req: EditWholeRequest): Promise<string> {
    throw new Error("AI editing is not available yet (arrives in Phase 3).");
  }
}

// Singleton accessor. Defaults to the on-device local provider, which builds
// real prompts and runs them once (a) the model is downloaded and (b) a Dev
// Client build has registered the llama runtime. Until then its methods throw
// clear, user-facing messages that the screens display.
let instance: CoverLetterAI = new LocalLlamaProvider();

export function getAI(): CoverLetterAI {
  return instance;
}

/** Lets a later phase register the real backend (e.g. local Qwen). */
export function setAI(provider: CoverLetterAI): void {
  instance = provider;
}
