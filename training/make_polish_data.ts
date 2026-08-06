// Builds Option-A (POLISH) training data: for each gold example we build the
// app's real library SKELETON from the profile+job, and pair it with the gold
// letter as the polished target. The user turn is the EXACT prompt the app
// sends at runtime (buildWholePrompt + POLISH_INSTRUCTION), so the LoRA trains
// on precisely what it will see live.
//
//   npx tsx training/make_polish_data.ts
//   -> training/dataset/train_polish.jsonl
//
// CPU only, no GPU.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTemplateLetter } from "../src/ai/template";
import { buildWholePrompt } from "../src/ai/prompt";
import { stripDashes } from "../src/ai/humanize";
import { SYSTEM, POLISH_INSTRUCTION } from "../src/ai/promptConstants";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEED = join(HERE, "dataset", "seed.json");
const OUT = join(HERE, "dataset", "train_polish.jsonl");

function fullProfile(sp: any) {
  return {
    profile: {
      id: 1,
      name: sp.name,
      location: sp.location ?? null,
      email: sp.email ?? null,
      phone: sp.phone ?? null,
      linkedin: null,
      portfolio: null,
    },
    skills: (sp.skills ?? []).map((s: string, i: number) => ({ id: i, profileId: 1, skill: s })),
    experience: (sp.experience ?? []).map((e: any, i: number) => ({ id: i, profileId: 1, ...e })),
    education: (sp.education ?? []).map((e: any, i: number) => ({ id: i, profileId: 1, ...e })),
    projects: (sp.projects ?? []).map((p: any, i: number) => ({ id: i, profileId: 1, ...p })),
    certifications: [],
    volunteer: [],
  };
}

const seed = JSON.parse(readFileSync(SEED, "utf8"));
const lines: string[] = [];

for (const ex of seed) {
  const req: any = { profile: fullProfile(ex.profile), job: ex.job, instructions: [] };

  // Tier-1 skeleton (what the model receives), dashes stripped like the app does.
  const skeleton = stripDashes(buildTemplateLetter(req));

  // The gold, polished target — same greeting/sign-off structure as the skeleton
  // so the model learns to rewrite the BODY, not the scaffolding.
  const target = `Dear Hiring Manager,\n\n${stripDashes(ex.letter_body.trim())}\n\nSincerely,\n${ex.profile.name}`;

  // The exact user turn the app sends at runtime.
  const user = buildWholePrompt({ fullText: skeleton, instruction: POLISH_INSTRUCTION, instructions: [] });

  lines.push(
    JSON.stringify({
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
        { role: "assistant", content: target },
      ],
    })
  );
}

writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`Wrote ${lines.length} polish pairs -> ${OUT}`);
