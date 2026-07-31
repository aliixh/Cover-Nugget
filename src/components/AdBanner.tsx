// Renders a banner ad if a native ads renderer has been registered (dev/prod
// build), otherwise renders nothing. Safe to drop into any screen.

import React from "react";
import { getAdsRenderer } from "../ads/ads";

export function AdBanner() {
  const renderer = getAdsRenderer();
  if (!renderer) return null; // Expo Go / web, or ads not configured yet.
  const Banner = renderer.Banner;
  return <Banner />;
}
