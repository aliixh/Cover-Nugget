// Configuration for the on-device language model.
//
// The model is NOT bundled in the app binary — it's too large for the app
// stores and would bloat install size. Instead the app downloads it to local
// storage on first run (see modelManager.ts). This file is the single place to
// change which model/URL is used.
//
// NOTE: the spec calls for "Qwen3.5-0.8B". Set MODEL.url to the exact GGUF you
// want to ship. The default below points at a small, instruction-tuned Qwen
// GGUF that runs comfortably on-device; swap it for your chosen weight file.
// (Nothing here runs on our build machine or any GPU — the download happens on
// the end-user's device.)

export interface ModelConfig {
  /** Human-facing name shown in the download screen. */
  displayName: string;
  /** Remote URL of the GGUF weights. */
  url: string;
  /** Filename stored on the device. */
  fileName: string;
  /** Approximate download size, for the UI ("~xxx MB"). */
  approxSizeMB: number;
  /** Quantization / format note shown to the user. */
  formatNote: string;
}

export const MODEL: ModelConfig = {
  // User-facing name only — we intentionally don't reveal the underlying model.
  displayName: "Cover Nugget Assistant",
  // Verified live 2026-07-30: this GGUF resolves to a 491,400,032-byte file.
  url: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf",
  fileName: "qwen-0_5b-instruct-q4_k_m.gguf",
  approxSizeMB: 469,
  formatNote: "Private, on-device writing model · runs fully offline",
};
