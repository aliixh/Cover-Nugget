// Central color source of truth (mirrors tailwind.config.js + spec section 19).
//
// Tailwind classes cover most of the UI, but a few places need raw color values
// in JavaScript - React Navigation's drawer/header theming and inline styles for
// native components that don't accept `className`. Keep this in sync with
// tailwind.config.js.

export const lightColors = {
  background: "#FFF0F4",
  surface: "#FFFFFF",
  primary: "#12372A",
  secondary: "#436850",
  accent: "#FF6B8A",
  highlight: "#FFD6E0",
  text: "#1A1A1A",
  muted: "#6B7280",
  border: "#E7DED6",
} as const;

export const darkColors = {
  background: "#14201C",
  surface: "#1E332A",
  primary: "#7FAE8E",
  secondary: "#436850",
  accent: "#FF7B96",
  highlight: "#FFB8C9",
  text: "#FDF8F2",
  muted: "#9BB0A6",
  border: "#2A4438",
} as const;

// Structural type (string values) so both light and dark palettes satisfy it -
// deriving from `typeof lightColors` would lock each field to a literal.
export interface AppColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  highlight: string;
  text: string;
  muted: string;
  border: string;
}

/** Returns the palette for the active color scheme. */
export function getColors(scheme: "light" | "dark" | null | undefined): AppColors {
  return scheme === "dark" ? darkColors : lightColors;
}
