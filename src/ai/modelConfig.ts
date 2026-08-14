// Configuration for the on-device language model.
//
// The model is NOT bundled in the app binary - it's too large for the app
// stores and would bloat install size. Instead the app downloads it to local
// storage on first run (see modelManager.ts). This file is the single place to
// change which model/URL is used.
//
// The shipped model is our fine-tuned Llama-3.2-1B (LoRA merged in, quantized to
// Q4_K_M, ~770 MB). It was trained to POLISH the deterministic skeleton in the
// app's voice (see training/ + training/README.md "Export to GGUF"). Because the
// LoRA is merged into the weights, it's a single GGUF - no separate adapter.
// Host the GGUF (produced by the export step) and set MODEL.url to it below.
// (Nothing here runs on our build machine or any GPU - the download happens on
// the end-user's device.)

/** Optional fine-tuned LoRA adapter (GGUF), downloaded next to the base model
 *  and applied at load. Produced by training/ (see training/README.md). Leave
 *  `MODEL.adapter` undefined to run the plain base model. */
export interface AdapterConfig {
  /** Remote URL of the GGUF LoRA adapter. */
  url: string;
  /** Filename stored on the device. */
  fileName: string;
  /** Approximate download size, for the UI ("~xx MB"). */
  approxSizeMB: number;
}

export interface ModelConfig {
  /** Human-facing name shown in the download screen. */
  displayName: string;
  /** Remote URL of the GGUF weights. */
  url: string;
  /** Filename stored on the device. */
  fileName: string;
  /** Approximate download size, for the UI ("~xxx MB"). */
  approxSizeMB: number;
  /** Exact byte size of the finished file. Used to tell a COMPLETE download from
   *  a partial/in-progress one (a resumable download's partial file still exists
   *  on disk, so existence alone is not enough to call it downloaded). */
  sizeBytes: number;
  /** Quantization / format note shown to the user. */
  formatNote: string;
  /** Optional cover-letter LoRA adapter applied on top of the base model. */
  adapter?: AdapterConfig;
}

export const MODEL: ModelConfig = {
  // User-facing name only - we intentionally don't reveal the underlying model.
  displayName: "Cover Nugget Assistant",
  // Fine-tuned Llama-3.2-1B (LoRA merged), q4_k_m, hosted on Hugging Face.
  url: "https://huggingface.co/aliixh/cover-nugget-1b/resolve/main/cover-nugget-1b-q4_k_m.gguf",
  fileName: "cover-nugget-1b-q4_k_m.gguf",
  approxSizeMB: 770,
  sizeBytes: 807693984,
  formatNote: "Private, on-device writing model · runs fully offline",
  // LoRA is merged into the weights above, so no separate adapter is needed.
  // (AdapterConfig is kept for the alternative base+adapter strategy.)
};
