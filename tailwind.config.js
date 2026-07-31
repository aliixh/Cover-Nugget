/** @type {import('tailwindcss').Config} */
// Cover Nugget design system. Colors mirror the spec (section 19).
// Dark mode uses the "class" strategy; the root layout toggles it from the
// device color scheme so `dark:` variants work across the app.
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ---- Light mode ----
        background: "#FFF0F4", // soft blush pink (pairs with the dark green)
        surface: "#FFFFFF",
        primary: "#12372A",
        secondary: "#436850",
        accent: "#FF6B8A",
        highlight: "#FFD6E0",
        ink: "#1A1A1A", // body text (light)
        muted: "#6B7280", // secondary text (light)
        border: "#E7DED6",
        // ---- Dark mode ----
        "dark-background": "#14201C",
        "dark-surface": "#1E332A",
        "dark-primary": "#7FAE8E",
        "dark-accent": "#FF7B96",
        "dark-highlight": "#FFB8C9",
        "dark-ink": "#FDF8F2", // body text (dark)
        "dark-muted": "#9BB0A6", // secondary text (dark)
        "dark-border": "#2A4438",
      },
    },
  },
  plugins: [],
};
