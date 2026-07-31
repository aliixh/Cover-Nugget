// Ads seam (spec §20 Phase 4 — AdMob monetization).
//
// Like the LLM runtime, the ad SDK (react-native-google-mobile-ads) is a native
// module that only exists in a Dev Client / production build. To keep the app
// bundling in Expo Go / web, we never import it directly — a dev build registers
// a renderer here at startup. Until then, ad slots render nothing.

import type React from "react";

export interface AdsRenderer {
  /** A banner ad component (already configured with a unit id). */
  Banner: React.ComponentType<Record<string, never>>;
}

let renderer: AdsRenderer | null = null;

/** Called by a Dev Client build once the ad SDK is available. */
export function setAdsRenderer(r: AdsRenderer): void {
  renderer = r;
}

export function getAdsRenderer(): AdsRenderer | null {
  return renderer;
}
