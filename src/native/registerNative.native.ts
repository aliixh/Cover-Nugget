// Native-module registration — iOS / Android (Metro picks this `.native` file).
//
// The on-device LLM (`llama.rn`) and AdMob (`react-native-google-mobile-ads`)
// are CUSTOM native modules. They exist in a Dev Client / production build but
// NOT in Expo Go. We therefore:
//   1. pull them in with `require` (not `import`) so a missing module degrades
//      gracefully instead of crashing the JS bundle, and
//   2. gate on the execution environment so Expo Go ('storeClient') stays a
//      no-op and only real dev/standalone builds register.
//
// This is the wiring that used to be a manual copy-paste in docs/AI_MODEL.md —
// it is now automatic: `_layout.tsx` calls registerNative() once at startup and
// every AI/ad action becomes real in a dev build with zero further code.
//
// AdMob unit ids: TestIds are used unless EXPO_PUBLIC_ADMOB_BANNER_ID is set,
// so dev builds never risk serving live ads against unfilled inventory.
import Constants from "expo-constants";
import { setLlamaRuntime } from "../ai/runtime";
import { getDownloadedAdapterPath } from "../ai/modelManager";
import { SYSTEM } from "../ai/promptConstants";

// Provided by the Metro/React Native runtime.
declare const require: (name: string) => any;

export function registerNative(): void {
  // Expo Go can't load custom native modules — leave everything stubbed.
  if (Constants.executionEnvironment === "storeClient") return;

  // --- On-device LLM (llama.rn) ---
  try {
    const { initLlama } = require("llama.rn");
    let ctx: any = null;
    setLlamaRuntime({
      async load(path: string) {
        // 4096 ctx gives room for a capped job description + profile + output.
        // Apply the cover-letter LoRA adapter if one has been downloaded.
        const lora = await getDownloadedAdapterPath();
        ctx = await initLlama({ model: path, n_ctx: 4096, ...(lora ? { lora } : {}) });
      },
      async complete(prompt: string, opts?: { maxTokens?: number }) {
        const n_predict = opts?.maxTokens ?? 512;
        // Feed the model via its chat template — this matches how the LoRA is
        // fine-tuned and how an instruct model expects input. Fall back to a raw
        // prompt if this llama.rn build doesn't accept `messages`.
        try {
          const r = await ctx.completion({
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: prompt },
            ],
            n_predict,
          });
          return r.text as string;
        } catch {
          const r = await ctx.completion({ prompt, n_predict });
          return r.text as string;
        }
      },
    });
  } catch {
    // llama.rn absent in this build — generation falls back to the template.
  }

  // --- Banner ads (AdMob) — HELD OFF for now, space kept. ------------------
  // The ads *seam* stays live (`src/ads/ads.ts` + `<AdBanner/>` on Home render
  // nothing until a renderer is registered), so enabling ads later is code-
  // local and needs no UI change. To turn ads on:
  //   1. npm install react-native-google-mobile-ads
  //   2. add the config plugin + your AdMob app ids to app.json (docs/MONETIZATION.md)
  //   3. uncomment the block below (and the setAdsRenderer/React imports).
  //
  // import React from "react";
  // import { setAdsRenderer } from "../ads/ads";
  // try {
  //   const { BannerAd, BannerAdSize, TestIds } = require("react-native-google-mobile-ads");
  //   const unitId = process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || TestIds.BANNER;
  //   setAdsRenderer({
  //     Banner: () =>
  //       React.createElement(BannerAd, {
  //         unitId,
  //         size: BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
  //       }),
  //   });
  // } catch {
  //   // ad SDK absent — ad slots keep rendering nothing.
  // }
}
