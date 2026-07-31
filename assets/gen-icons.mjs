// Build-time asset generator for Cover Nugget.
// Renders the dino-nugget mascot to the PNGs Expo needs. Run from a place where
// `sharp` resolves (a throwaway build dep — intentionally NOT in the app deps).
// Nothing here uses the GPU: sharp rasterizes on CPU.
//
//   node assets/gen-icons.mjs
//
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DIR = dirname(fileURLToPath(import.meta.url));

// Brand palette (mirrors src/theme/colors.ts)
const CREAM = "#FFF8F2";
const GREEN = "#12372A";
const GREEN_D = "#14201C";
const PINK = "#FF6B8A";
const SAGE = "#7FAE8E";
const BREAD = "#F0A94B"; // golden nugget
const BREAD_D = "#D98E30"; // nugget shadow edge
const BROWN = "#5A3A1E"; // eyes/mouth

// Wobbly nugget blob, centered on (512, 545), ~330 half-width.
const NUGGET_PATH =
  "M512 220 " +
  "C620 214 712 250 748 322 " +
  "C792 360 832 402 820 470 " +
  "C846 540 838 628 782 686 " +
  "C742 760 648 812 540 812 " +
  "C436 820 340 792 286 726 " +
  "C214 700 178 616 198 540 " +
  "C176 466 210 384 276 340 " +
  "C316 268 404 226 512 220 Z";

// Little dino back-plates (sage triangles) peeking above the nugget.
function plate(cx, cy, w, h) {
  return `<path d="M${cx - w} ${cy} L${cx} ${cy - h} L${cx + w} ${cy} Z" fill="${SAGE}"/>`;
}

// The mascot, drawn on a 1024x1024 canvas, no background.
function mascot() {
  return `
    <g>
      <!-- dino plates behind the nugget -->
      ${plate(392, 250, 34, 60)}
      ${plate(468, 226, 40, 74)}
      ${plate(552, 224, 40, 74)}
      ${plate(632, 250, 34, 60)}

      <!-- nugget body -->
      <path d="${NUGGET_PATH}" fill="${BREAD}" stroke="${BREAD_D}" stroke-width="10"/>
      <!-- breaded bumps -->
      <g fill="${BREAD_D}" opacity="0.35">
        <circle cx="360" cy="430" r="16"/>
        <circle cx="470" cy="360" r="13"/>
        <circle cx="640" cy="400" r="15"/>
        <circle cx="700" cy="520" r="14"/>
        <circle cx="330" cy="600" r="14"/>
        <circle cx="600" cy="690" r="15"/>
        <circle cx="470" cy="650" r="12"/>
      </g>

      <!-- pink cheeks -->
      <ellipse cx="388" cy="586" rx="42" ry="30" fill="${PINK}" opacity="0.85"/>
      <ellipse cx="636" cy="586" rx="42" ry="30" fill="${PINK}" opacity="0.85"/>

      <!-- eyes -->
      <circle cx="430" cy="510" r="46" fill="#FFFFFF"/>
      <circle cx="594" cy="510" r="46" fill="#FFFFFF"/>
      <circle cx="442" cy="518" r="22" fill="${BROWN}"/>
      <circle cx="606" cy="518" r="22" fill="${BROWN}"/>
      <circle cx="450" cy="510" r="7" fill="#FFFFFF"/>
      <circle cx="614" cy="510" r="7" fill="#FFFFFF"/>

      <!-- happy mouth -->
      <path d="M462 610 Q512 668 562 610" fill="none" stroke="${BROWN}"
            stroke-width="14" stroke-linecap="round"/>
    </g>`;
}

function svgFullBleed() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <defs>
      <radialGradient id="bg" cx="50%" cy="40%" r="75%">
        <stop offset="0%" stop-color="${GREEN}"/>
        <stop offset="100%" stop-color="${GREEN_D}"/>
      </radialGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#bg)"/>
    ${mascot()}
  </svg>`;
}

// Foreground / splash: mascot only, transparent, scaled into the ~66% safe zone.
function svgTransparent(scale = 1) {
  const s = scale;
  const off = (1024 - 1024 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <g transform="translate(${off} ${off}) scale(${s})">${mascot()}</g>
  </svg>`;
}

const jobs = [
  { name: "icon.png", svg: svgFullBleed(), size: 1024 },
  { name: "adaptive-icon.png", svg: svgTransparent(0.68), size: 1024 },
  { name: "splash-icon.png", svg: svgTransparent(0.8), size: 1024 },
  { name: "favicon.png", svg: svgFullBleed(), size: 48 },
];

for (const j of jobs) {
  const out = join(DIR, j.name);
  await sharp(Buffer.from(j.svg)).resize(j.size, j.size).png().toFile(out);
  console.log("wrote", j.name, `${j.size}x${j.size}`);
}
// keep the source SVG for future tweaks
writeFileSync(join(DIR, "mascot.svg"), svgFullBleed());
console.log("wrote mascot.svg");
