// Cover-letter FORMATS (spec: letter layout presets).
//
// A "format" only rearranges the scaffolding around the letter - the contact
// header, the date, the greeting, the closing salutation, and the spacing /
// indentation. The body paragraphs the user actually wrote are preserved, so
// the editor can cycle through formats instantly with NO model call.
//
// Because the in-app view is plain text, formats differ by TEXT STRUCTURE
// (which is visible in-app and exports faithfully) rather than by alignment,
// which only a rich renderer could show. Semi-Block uses a real first-line
// indent (a leading tab) that the exporter turns into a proper text-indent.

import type { Profile } from "../types/models";

export interface LetterParts {
  greeting: string; // e.g. "Dear Hiring Manager,"
  paragraphs: string[]; // body paragraphs only (no greeting / no sign-off)
}

export interface LetterFormat {
  key: string;
  name: string; // shown on the cycle button
  blurb: string; // one-line description
  render: (p: Profile, parts: LetterParts, company?: string, role?: string) => string;
}

const RULE = "──────────────────────────";
const DOTS = "•  •  •";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function today(): string {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}


const t = (s?: string | null) => (s ?? "").trim();

function contactBits(p: Profile): string[] {
  return [p.email, p.phone, p.linkedin, p.portfolio].map(t).filter(Boolean);
}

/** Join non-empty sections with a blank line between them. Only surrounding
 *  blank lines are trimmed - a leading tab (semi-block indent) is preserved. */
function join(sections: (string | undefined)[]): string {
  return sections
    .map((s) => (s ?? "").replace(/^\n+|\n+$/g, ""))
    .filter((s) => s.trim().length > 0)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+$/, "");
}

/** Body paragraphs, optionally first-line indented (semi-block). */
function body(parts: LetterParts, indent = false): string {
  return parts.paragraphs.map((para) => (indent ? `\t${para}` : para)).join("\n\n");
}

// --------------------------------------------------------------------------
// The presets.
// --------------------------------------------------------------------------

export const LETTER_FORMATS: LetterFormat[] = [
  {
    key: "block",
    name: "Classic Block",
    blurb: "Name, address, contact, date, all left-aligned. The standard.",
    render: (p, parts) =>
      join([
        [t(p.name), t(p.location), contactBits(p).join(" · ")].filter(Boolean).join("\n"),
        today(),
        parts.greeting,
        body(parts),
        `Sincerely,\n${t(p.name)}`,
      ]),
  },
  {
    key: "modern",
    name: "Modern Compact",
    blurb: "Tight two-line header, no date block. Clean and tech-friendly.",
    render: (p, parts) =>
      join([
        [t(p.name), contactBits(p).join("  ·  ")].filter(Boolean).join("\n"),
        parts.greeting,
        body(parts),
        `Best regards,\n${t(p.name)}`,
      ]),
  },
  {
    key: "formal",
    name: "Formal",
    blurb: "Stacked sender block with the date, single-spaced. Traditional.",
    render: (p, parts) =>
      join([
        // Sender block + date, single-spaced (no blank line before the date).
        [t(p.name), t(p.location), t(p.email), t(p.phone), today()]
          .filter(Boolean)
          .join("\n"),
        parts.greeting,
        body(parts),
        `Respectfully,\n${t(p.name)}`,
      ]),
  },
  {
    key: "email",
    name: "Email Style",
    blurb: "No header up top; contact info sits under your signature.",
    render: (p, parts) =>
      join([
        parts.greeting,
        body(parts),
        [`Best,`, t(p.name), contactBits(p).join(" · ")].filter(Boolean).join("\n"),
      ]),
  },
  {
    key: "semiblock",
    name: "Semi-Block",
    blurb: "Like block, but each paragraph is indented. Warmer, classic.",
    render: (p, parts) =>
      join([
        [t(p.name), t(p.location), contactBits(p).join(" · ")].filter(Boolean).join("\n"),
        today(),
        parts.greeting,
        body(parts, true),
        `Kind regards,\n${t(p.name)}`,
      ]),
  },
  {
    key: "minimal",
    name: "Minimalist",
    blurb: "Uppercase name, bullet-separated contact, spare and modern.",
    render: (p, parts) =>
      join([
        // Name, contact, and date all single-spaced - a tight header block.
        [t(p.name).toUpperCase(), contactBits(p).join("  •  "), today()]
          .filter(Boolean)
          .join("\n"),
        parts.greeting,
        body(parts),
        `Sincerely,\n${t(p.name)}`,
      ]),
  },
  {
    key: "executive",
    name: "Executive",
    blurb: "Uppercase letterhead, a rule under the header, and a Re: line.",
    render: (p, parts, _company, role) =>
      join([
        // Letterhead: uppercase name + pipe-separated contact, underlined by a rule.
        [t(p.name).toUpperCase(), contactBits(p).join("  |  ")].filter(Boolean).join("\n") +
          "\n" +
          RULE,
        today(),
        role ? `Re: Application for ${role}` : undefined,
        parts.greeting,
        body(parts),
        `Sincerely,\n${t(p.name)}`,
      ]),
  },
  {
    key: "creative",
    name: "Creative",
    blurb: "Sparkle-separated contact, a dot section break, warm sign-off.",
    render: (p, parts) =>
      join([
        [t(p.name), contactBits(p).join("  ✦  ")].filter(Boolean).join("\n"),
        DOTS,
        parts.greeting,
        body(parts),
        `Warmly,\n${t(p.name)}`,
      ]),
  },
];

/** Index of a format by its key (defaults to the first, Classic Block). */
export function formatIndexByKey(key?: string | null): number {
  const i = LETTER_FORMATS.findIndex((f) => f.key === key);
  return i >= 0 ? i : 0;
}

// Recognizers used to pull the body back out of an already-formatted letter so
// it can be re-rendered in another format.
const GREETING_RE = /^(dear\b|to whom it may concern|hello\b|hi\b|greetings|to the\b)/i;
const CLOSING_RE =
  /^(sincerely(?: yours)?|yours sincerely|best regards|kind regards|warm regards|warmly|best|regards|respectfully|thank you|thanks|yours truly|cordially|cheers|all the best|with appreciation)[,.]?$/i;

/**
 * Split a letter string into its greeting + body paragraphs, discarding the
 * contact header, date, recipient block, and sign-off (which each format
 * rebuilds). Robust to whatever format produced it and to raw model output.
 */
export function deconstructLetter(content: string): LetterParts {
  const lines = content.replace(/\r/g, "").split("\n");
  const greetingIdx = lines.findIndex((l) => GREETING_RE.test(l.trim()));
  let closingIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (CLOSING_RE.test(lines[i].trim())) {
      closingIdx = i;
      break;
    }
  }
  const greeting = greetingIdx >= 0 ? lines[greetingIdx].trim() : "Dear Hiring Manager,";
  const start = greetingIdx >= 0 ? greetingIdx + 1 : 0;
  const end = closingIdx > start ? closingIdx : lines.length;
  const bodyText = lines.slice(start, end).join("\n").trim();
  let paragraphs = bodyText
    .split(/\n{2,}/)
    .map((b) => b.split("\n").map((l) => l.trim()).join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (paragraphs.length === 0) paragraphs = [bodyText || content.trim()].filter(Boolean);
  return { greeting, paragraphs };
}

/** Re-render `content` in the format at `index`, preserving the body. */
export function applyLetterFormat(
  content: string,
  index: number,
  profile: Profile,
  company?: string | null,
  role?: string | null
): string {
  const fmt = LETTER_FORMATS[index] ?? LETTER_FORMATS[0];
  return fmt.render(profile, deconstructLetter(content), company ?? undefined, role ?? undefined);
}
