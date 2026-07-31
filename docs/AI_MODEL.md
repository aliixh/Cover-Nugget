# On-device AI model

Cover Nugget runs its LLM **privately on the user's device**. The weights are
**not** bundled in the app (too large for the stores) — the app **downloads the
model on first run** and then works fully offline. No data leaves the device,
and nothing here uses a server GPU.

## How it fits together
```
src/ai/
  modelConfig.ts   // which model + download URL (change this to your GGUF)
  modelManager.ts  // download (with progress) / status / delete  ← works everywhere
  runtime.ts       // LlamaRuntime seam — a Dev Client build registers the engine
  localProvider.ts // CoverLetterAI impl: builds prompts + calls the runtime
  prompt.ts        // pure prompt builders (profile + job + user rules)
  index.ts         // getAI() -> LocalLlamaProvider (default)
```

The user downloads the model from the **AI Model** screen (drawer). A first-run
banner on Home also nudges them to download it.

## Downloading works everywhere; inference needs a Dev Client build
- **Download**: works in Expo Go, Dev Client, and production builds (web can't
  store a local model, so the screen explains that).
- **Inference**: the LLM engine (`llama.rn`) is a **custom native module**, so it
  only exists in a **Dev Client / production build** — *not* Expo Go. Until a
  runtime is registered, the AI methods throw a clear message the UI displays.

## Wiring the real engine (Dev Client / production)
**This is already wired in code.** `llama.rn` is registered automatically at
startup by `src/native/registerNative.native.ts` (called from `app/_layout.tsx`).
Metro loads that `.native` file only on iOS/Android; web gets the no-op stub in
`registerNative.ts`, and the registration is additionally gated so **Expo Go
stays download-only** (it can't load the custom native module). No copy-paste
needed — you only build:

1. `llama.rn` and `expo-dev-client` are already in `package.json`. Install:
   ```bash
   npm install
   ```
2. Build a Dev Client and run against it:
   ```bash
   eas build --profile development --platform ios   # or android
   npx expo start --dev-client
   ```
Once the model is downloaded (auto on first run) and you're on the dev build,
every generate/edit action runs the real Qwen locally — fully offline.

## Choosing the model
Set `MODEL.url` / `fileName` / `approxSizeMB` in `src/ai/modelConfig.ts`. The
default points at a small instruction-tuned Qwen GGUF; swap it for the exact
weight file you want to ship (the spec references "Qwen3.5-0.8B" — point this at
your chosen GGUF). Prefer a 4-bit quant (`Q4_K_M`) for phone-friendly size/speed.
