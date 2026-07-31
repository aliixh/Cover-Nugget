# MEMORY.md — Project Long-Term Memory

_Curated facts about THIS side project. Self-contained to `side-project/`._

## Standing Facts
- **This is a SIDE project** — completely separate from the user's **main project**. No context bleed, ever.
- Project lives entirely inside `side-project/`. Do not touch files outside this folder.
- **⚠️ NEVER use the GPU.** The user runs something on the GPU that must not be interrupted. All work here is cloud/CPU only. The local Qwen model (Phase 4) must NOT be run on the user's GPU.

## Project: Cover Nugget 🦖🍗
- **What:** Privacy-focused, **local-first** AI cover letter generator **mobile app**.
- **Stack:** React Native + Expo, TypeScript, Expo Router, NativeWind, expo-sqlite. No backend, no auth, no cloud DB (offline + privacy).
- **Core loop:** reusable career profile + job link/description → AI-generated cover letter → highlight/manual/whole-letter AI editing → archive + export (PDF/Word/Google Docs/copy).
- **AI model (later):** Qwen3.5-0.8B, kept **modular** so it can be dropped in at Phase 4. Not wired up yet.
- **Design:** Dinosaur-nugget mascot; friendly/premium/modern. Palette in `src/theme/colors.ts` (light `#FFF8F2`/`#12372A`/`#FF6B8A`, dark `#14201C`/`#7FAE8E`).
- **Build order:** P1 nav+onboarding+profile storage+main+archive UI · P2 job input+editor+export · P3 AI gen+highlight edit+settings · P4 Jina Reader+local Qwen+AdMob+release.
- **Current status:** Building Phase 1.

## User
- Email on file: shujunyi@gmail.com. Preferred name: _(not yet given)_.

## Me (identity)
- Name / vibe / emoji: _(not yet chosen)_.
