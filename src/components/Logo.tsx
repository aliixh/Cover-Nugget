// The dino-nugget mascot logo (background removed). Replaces the 🦖🍗 emoji
// across the app. The source art is landscape, so we render into a box sized by
// `width` with a proportional height and `contain` so it never distorts.

import React from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";

const NUGGET = require("../../assets/brand/nugget-dino1-cut.png");

// Aspect ratio of the trimmed art (width : height).
const RATIO = 226 / 161;

export function Logo({
  width = 120,
  style,
}: {
  width?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={NUGGET}
      resizeMode="contain"
      accessibilityLabel="Cover Nugget"
      style={[{ width, height: Math.round(width / RATIO) }, style]}
    />
  );
}
