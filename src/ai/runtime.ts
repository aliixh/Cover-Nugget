// Inference-runtime seam.
//
// The actual on-device LLM engine (e.g. llama.rn / llama.cpp bindings) is a
// custom native module and therefore only exists in a Dev Client / production
// build — NOT in Expo Go or on web. To keep the whole app bundling everywhere,
// we never `import "llama.rn"` directly. Instead a dev build registers a
// runtime object here at startup via `setLlamaRuntime()`.
//
// See docs/AI_MODEL.md for the ~15 lines a dev build adds to wire llama.rn in.

export interface LlamaRuntime {
  /** Load the GGUF weights from an on-device path (idempotent). */
  load(modelPath: string): Promise<void>;
  /** Run a completion for the given prompt and return the generated text. */
  complete(prompt: string, options?: { maxTokens?: number }): Promise<string>;
}

let runtime: LlamaRuntime | null = null;

/** Called by a Dev Client build once llama.rn is available. */
export function setLlamaRuntime(r: LlamaRuntime): void {
  runtime = r;
}

/** Returns the registered runtime, or null when running without one. */
export function getLlamaRuntime(): LlamaRuntime | null {
  return runtime;
}
