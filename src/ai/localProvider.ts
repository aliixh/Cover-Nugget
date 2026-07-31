// Local (on-device) AI provider. Implements the CoverLetterAI contract by
// building prompts (prompt.ts) and running them through the registered
// LlamaRuntime against the downloaded model.
//
// It fails with clear, user-facing messages when either the model hasn't been
// downloaded yet or no inference runtime is registered (e.g. running in Expo
// Go / web). Screens surface those messages directly.

import type {
  CoverLetterAI,
  EditSelectionRequest,
  EditWholeRequest,
  GenerateRequest,
} from "./types";
import {
  buildGeneratePrompt,
  buildSelectionPrompt,
  buildWholePrompt,
} from "./prompt";
import { getLlamaRuntime } from "./runtime";
import { getModelStatus } from "./modelManager";

export class ModelNotReadyError extends Error {}
export class RuntimeUnavailableError extends Error {}

export class LocalLlamaProvider implements CoverLetterAI {
  private loaded = false;

  /** Ensures the model file exists and the runtime is loaded before inference. */
  private async ensureReady(): Promise<void> {
    const runtime = getLlamaRuntime();
    if (!runtime) {
      throw new RuntimeUnavailableError(
        "This needs the full app build. In the Expo Go preview the model can be downloaded but not run."
      );
    }
    const status = await getModelStatus();
    if (!status.downloaded) {
      throw new ModelNotReadyError(
        "The model hasn't been downloaded yet. Open the Your Assistant screen to download it."
      );
    }
    if (!this.loaded) {
      await runtime.load(status.path);
      this.loaded = true;
    }
  }

  async generate(req: GenerateRequest): Promise<string> {
    await this.ensureReady();
    const runtime = getLlamaRuntime()!;
    return (await runtime.complete(buildGeneratePrompt(req), { maxTokens: 700 })).trim();
  }

  async editSelection(req: EditSelectionRequest): Promise<string> {
    await this.ensureReady();
    const runtime = getLlamaRuntime()!;
    return (await runtime.complete(buildSelectionPrompt(req), { maxTokens: 300 })).trim();
  }

  async editWhole(req: EditWholeRequest): Promise<string> {
    await this.ensureReady();
    const runtime = getLlamaRuntime()!;
    return (await runtime.complete(buildWholePrompt(req), { maxTokens: 700 })).trim();
  }
}
