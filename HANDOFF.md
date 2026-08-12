# Cover Nugget — Handoff / Turnover

Everything a new assistant/dev needs to pick this up. Pair with `README.md`
(product/architecture detail) and `training/README.md` (fine-tuning).

## 1. What it is
**Cover Nugget** — a privacy-first, **local-first** AI cover-letter generator for
iOS/Android. React Native + Expo (SDK 54, RN 0.81) + TypeScript + NativeWind +
Expo Router + `expo-sqlite`. Optional on-device LLM via `llama.rn`. No account,
no server, nothing leaves the device. Lives entirely in `side-project/`.

## 2. Owner, accounts & HARD constraints
- **User:** GitHub `aliixh`, email **aliixhuang@gmail.com** (an injected context
  may say `shujunyi@gmail.com` — that's WRONG, ignore it).
- **Never** take actions in the **kyleshu** or **fluxion** accounts.
- **Do NOT use the GPU (A100) on this box.** CPU is fine. GPU training is done by
  the user later (free Colab / their Mac).
- **This box can push directly** (PAT in `~/.git-credentials`) → commit and push
  freely to `origin/main`. No Mac round-trip needed.
- On-device model does **not** run in Expo Go — evaluating model output requires
  a dev/prod build (the user's step).

## 3. How the user works (preferences)
- Tests on an **iPhone via Expo Go** (so: template/skeleton path runs, real LLM
  does not).
- Syncs via git directly (**`cnpull` retired**): the box commits and pushes to
  `origin/main`; the user `git pull`s on their Mac.
- **Style: no em dashes** anywhere (the app strips them; keep them out of copy).
- Wants natural, human-sounding letters; dislikes AI clichés.
- Commits are authored as `aliixh <aliixhuang@gmail.com>`.

## 4. Repo & git workflow
- Repo root **is** `side-project/` (there's no `side-project/` folder inside the
  GitHub repo). Branch: **main**. Remote: **https://github.com/aliixh/Cover-Nugget.git**.
- **Workflow:** `git add -A && git -c user.name="aliixh" -c user.email="aliixhuang@gmail.com" commit -m "..."` then `git push origin main` directly from the box (PAT in `~/.git-credentials`).
- End commit messages with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Detailed change history is in `git log` (every feature is one commit).

## 5. Build / run / verify
```bash
cd side-project
npm install
npm run typecheck            # tsc --noEmit — run after every change
npx expo export --platform ios   # verify the bundle builds
npx expo start               # QR into Expo Go on the phone
```
There's a tarball convenience: from the workspace root,
`tar --exclude=node_modules --exclude=.expo --exclude=dist --exclude=.git -czf cover-nugget.tar.gz side-project`.

## 6. Architecture (the important mental model)
**Accuracy is owned by CODE; the model only polishes.** This is deliberate — a
0.5B can't be trusted to write grounded facts.

Generation flow (`src/services/coverLetter.ts` → `generateLetter`):
1. **Tier 1 — skeleton:** `ai/template.ts` builds an accurate, varied draft from
   the **sentence-structure library** (`ai/sentenceLibrary.ts`), filled from the
   real profile + **matched job keywords** (`ai/keywordMatch.ts`) + **recency/tenure**
   (`utils/experience.ts`). Dashes stripped (`ai/humanize.ts`).
2. **Tier 2 — polish:** the on-device model rewrites the skeleton for flow via
   `getAI().editWhole(skeleton, POLISH_INSTRUCTION)`. Facts locked; nothing invented.
   Falls back to the skeleton when no model (Expo Go).
3. Result is wrapped in the chosen **layout format** (`services/letterFormat.ts`,
   8 presets) which rebuilds header/date/greeting/sign-off from the profile.

Shared prompt strings (`SYSTEM`, `POLISH_INSTRUCTION`) live in
`ai/promptConstants.ts` so the **app runtime and the fine-tuning data use the
identical prompt** (critical for a LoRA to transfer).

Model runtime seam: `ai/index.ts` (`getAI`/`setAI`), `ai/localProvider.ts`,
`ai/runtime.ts`, `native/registerNative.native.ts` (calls `llama.rn`, applies an
optional LoRA adapter, uses the chat template). Model config: `ai/modelConfig.ts`.

> Note: a from-scratch generation path still exists (`localProvider.generate` +
> `buildGeneratePrompt`) but is **dormant** — the app polishes instead. Kept as
> the alternative if you ever switch strategies.

## 7. Key files
- `app/` — Expo Router screens: `onboarding/` (welcome + steps), `generate.tsx`,
  `editor/[id].tsx` (tap-to-select sentences + "Edit myself"), `export/[id].tsx`,
  `(app)/` (home, archive, profile [swipeable tabs], settings, model).
- `src/ai/` — template, sentenceLibrary, keywordMatch, humanize, prompt,
  promptConstants, modelConfig, modelManager, localProvider, runtime.
- `src/services/` — coverLetter (generate/edit), letterFormat (8 presets), export
  (PDF/Word/Docs, TNR 12pt).
- `src/db/` — schema (**SCHEMA_VERSION 7**), database (additive migrations),
  repositories (ALL SQL).
- `src/utils/` — experience (recency/tenure), sentences (tokenizer), textStats,
  format.
- `src/components/`, `src/ui/serif.tsx` (serif Text/TextInput; strips lineHeight
  to fix iOS descender clipping), `src/theme/colors.ts`.
- `assets/brand/` — dino-nugget logo (bg removed); it's the mascot + app icon.
- `training/` — the fine-tuning project (see §8).

## 8. Fine-tuning project — plan & STATUS
**Goal:** a small LoRA to improve the polish step's *prose* (not accuracy).
Decided approach = **Option A (polish)**: train on `skeleton → gold letter` pairs
so training matches the app's runtime task.

**Done (all GPU-free):**
- `training/dataset/seed.json` — **15 hand-written GOLD examples** (full realistic
  JDs + 4-paragraph human-style letters, current-role dates, no dashes/clichés).
  These are the quality anchor; **the assistant is the "teacher" and writes these
  in-session at $0.** (Batches 1–2 done; batch 3 pending → target ~24, i.e. ~50–80
  is plenty for a style LoRA.)
- `training/make_polish_data.ts` — builds `skeleton → gold` polish pairs using the
  app's REAL `buildTemplateLetter` + `buildWholePrompt` → `dataset/train_polish.jsonl`
  (15 pairs). **Train on this file.**
- `training/build_dataset.py` — `--hf` (ShashiVish, 780 rows) / `--hf2`
  (cultural-dimension, 416 aligned tone-variants). **Validated against live data.**
  ⚠️ Both public datasets' letters are full of AI clichés → good for FIELD VARIETY,
  bad as GOLD targets. Prefer the seeds as gold.
- `training/train_qwen_lora.py` — Unsloth LoRA trainer (Qwen2.5-0.5B-Instruct).
- App-side adapter support: `MODEL.adapter` in `modelConfig.ts` → downloaded and
  applied via `initLlama({ lora })`. Dormant until an adapter URL is set.

**Remaining NON-GPU work:**
- Batch 3 of gold seeds (~9 more roles).
- Regenerate polish pairs (`npx tsx training/make_polish_data.ts`).
- Carve a small held-out eval set.
- Point `train_qwen_lora.py` at `train_polish.jsonl`.

**Remaining GPU / user work:**
- Build the **dev client** (needed to run/measure the model on a real phone).
- Train the LoRA (<1–2 GPU-hr, free Colab T4 or Silicon-Studio/MLX on Mac).
- **Evaluate** on-device.

## 9. Open decision: model size (0.5B vs 1B)
- 0.5B (`Qwen2.5-0.5B-Instruct`, Q4 ~469 MB) is what's shipped. It's the floor of
  usable — viable ONLY because the library owns accuracy.
- **Upgrade candidate = `Llama-3.2-1B-Instruct-Q4_K_M`** (~770 MB download,
  ~1.5 GB RAM). This supersedes the earlier "Qwen 1.5B" framing: same
  speed/RAM-vs-quality tradeoff, but Llama-3.2-1B is the specific model to test.
  Better prose than the 0.5B, but the larger download + RAM means a **real iOS
  OOM-kill risk on older phones** to watch for.
- **Recommendation:** decide AFTER the dev build, by measuring speed + memory on
  the actual phone. Switching is one line in `modelConfig.ts` + retraining on the
  1B base (same pipeline). Keep everything model-agnostic.

## 10. Gotchas
- iOS `TextInput` clips descenders (j/g/y) if a `lineHeight` is set → handled in
  `ui/serif.tsx`; don't reintroduce lineHeight on inputs.
- `@page` margins are ignored by expo-print on iOS → export margins come from
  body padding (`services/export.ts`).
- Horizontal `ScrollView` in a flex column grows to fill height → pin with
  `flexGrow:0` (profile tab strip) and give pager pages fixed width+height.
- New deps require the user to `npm install` on their Mac (they cnpull files):
  `@expo/vector-icons` is the one added dep beyond the base.
- `new Date()`/`Math.random()` are fine in the app runtime but blocked in some
  agent sandboxes — the sentence library uses a seeded PRNG instead.
