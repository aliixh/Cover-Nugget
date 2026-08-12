// A large library of cover-letter sentence STRUCTURES, grouped by their role in
// the letter. The app fills the slots from the user's real profile + the matched
// job keywords (so it stays accurate) and picks variants to assemble a draft
// with real variation. The on-device model then POLISHES that draft for flow
// (see services/coverLetter.ts) — the library gives structure + facts, the LLM
// gives fluidity.
//
// Variant selection is seeded from the inputs, so the same profile+job produces
// a stable letter, but different jobs read differently. Add freely — variants
// mined from real letters (e.g. akhan02/cultural-dimension-cover-letters) slot
// straight in here.

export interface Slots {
  name: string;
  role: string;
  company: string;
  matched: string[]; // matched skills/keywords
  topSkills: string; // e.g. "React, TypeScript and GraphQL"
  recentClause: string; // "" or "I currently work as X at Y for about two years"
  achievement: string; // "" or a real sentence from experience
  degree: string; // "" or "a B.S. in Computer Science from UC Berkeley"
}

type S = (s: Slots) => string;

// --- Openers: express interest in the role -------------------------------
const OPENERS: S[] = [
  (s) => `The ${s.role} position at ${s.company} is a strong match for what I do.`,
  (s) => `The ${s.role} opening at ${s.company} immediately caught my eye.`,
  (s) => `I'm very interested in the ${s.role} role at ${s.company}.`,
  (s) => `${s.company}'s ${s.role} position stood out to me the moment I saw it.`,
  (s) => `I'd love to be considered for the ${s.role} role at ${s.company}.`,
  (s) => `When I came across the ${s.role} opening at ${s.company}, I knew I wanted to apply.`,
  (s) => `Applying for the ${s.role} position at ${s.company} is an easy decision for me.`,
  (s) => `I'm reaching out to put my name forward for the ${s.role} role at ${s.company}.`,
];

// --- Hooks: a quick reason it fits ---------------------------------------
const HOOKS: S[] = [
  () => `The work it involves is exactly what I care most about.`,
  () => `It lines up closely with what I do best.`,
  () => `It's the kind of role I've been working toward.`,
  () => `The focus of the position fits my experience well.`,
  () => `What draws me in is how well it matches my background.`,
  (s) => (s.topSkills ? `Your emphasis on ${s.topSkills} maps directly to my day-to-day work.` : `It's a strong match for my background.`),
];

// --- Recency: the current or most-recent role (only if we have dates) -----
const RECENT: S[] = [
  (s) => `${s.recentClause}, so I'd bring hands-on, relevant experience from day one.`,
  (s) => `${s.recentClause}.`,
  (s) => `${s.recentClause}, which has prepared me well for this next step.`,
  (s) => `${s.recentClause}, and I'm ready to bring that experience to your team.`,
];

// --- Skill match: tie matched skills to the posting (only if matched) -----
const SKILL_MATCH: S[] = [
  (s) => `Your posting calls for ${s.topSkills}, which are central to my experience.`,
  (s) => `You're looking for ${s.topSkills} — all areas I work in regularly.`,
  (s) => `The role asks for ${s.topSkills}, and those are exactly the strengths I'd bring.`,
  (s) => `I noticed you value ${s.topSkills}; these have been core to my recent work.`,
  (s) => `Much of what you describe — ${s.topSkills} — is where I do my best work.`,
];

// --- Achievement: a real, first-person sentence from the profile ----------
// (template.ts normalizes the raw "What you did" text to first person, so each
// of these reads correctly whether the model polishes it or we fall back.)
const ACHIEVEMENT: S[] = [
  (s) => s.achievement,
  (s) => `A recent highlight: ${s.achievement}`,
  (s) => `To put that concretely, ${s.achievement}`,
  (s) => `As one example, ${s.achievement}`,
];

// --- Education (optional) -------------------------------------------------
const EDUCATION: S[] = [
  (s) => `I hold ${s.degree}.`,
  (s) => `I also bring ${s.degree}.`,
  (s) => `My background includes ${s.degree}.`,
];

// --- Fallback middle paragraph when we have little structured data --------
const FALLBACK_FIT: S[] = [
  (s) => `I'm confident my background would let me contribute to ${s.company} quickly.`,
  (s) => `I believe my experience lines up well with what this role needs.`,
  () => `I'd bring energy, reliability, and a genuine interest in doing the work well.`,
];

// --- Closers -------------------------------------------------------------
const CLOSERS: S[] = [
  (s) => `I'd welcome the chance to discuss how I can help ${s.company}. Thank you for your time and consideration.`,
  () => `I'd love to talk about how my background fits your team. Thank you for considering my application.`,
  () => `Thank you for reviewing my application — I'd be glad to share more in a conversation.`,
  (s) => `I'd be glad to contribute to ${s.company}, and I appreciate you taking the time to consider me.`,
  () => `Thanks for your consideration; I hope we can discuss the role further.`,
];

// Tiny seeded RNG so the same inputs give a stable letter.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Assemble body paragraphs from the library, filled with the real slots. */
export function composeBody(slots: Slots): string {
  const rng = mulberry32(hashStr(`${slots.name}|${slots.company}|${slots.role}|${slots.achievement}`));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  const p1 = [
    pick(OPENERS)(slots),
    pick(HOOKS)(slots),
    slots.recentClause ? pick(RECENT)(slots) : "",
  ]
    .filter(Boolean)
    .join(" ");

  const midParts: string[] = [];
  if (slots.matched.length) midParts.push(pick(SKILL_MATCH)(slots));
  if (slots.achievement) midParts.push(pick(ACHIEVEMENT)(slots));
  if (slots.degree) midParts.push(pick(EDUCATION)(slots));
  const p2 = midParts.length ? midParts.join(" ") : pick(FALLBACK_FIT)(slots);

  const p3 = pick(CLOSERS)(slots);

  return [p1, p2, p3].filter(Boolean).join("\n\n");
}
