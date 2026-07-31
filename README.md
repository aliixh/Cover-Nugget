# Cover Nugget 🦖🍗

Privacy-focused, **local-first** AI cover letter generator (React Native + Expo).
This folder is fully self-contained — nothing here depends on files outside it,
and it is a **side project**, separate from the user's main project.

> ⚠️ **No GPU.** Nothing in this app runs on the GPU. The local Qwen model is a
> Phase-4 concern and is stubbed behind a modular interface (`src/ai/`).

## Status — Phases 1–4 built
Built: navigation, 9-step onboarding, local SQLite storage, main screen, archive,
profile editor, AI-instruction settings, **generate flow (job link via Jina
Reader or pasted description)**, **full editor with highlight + whole-letter AI
edits**, **export (copy / PDF / Word / Google Docs / share)**, **auto model
download on first run**, and modular seams for the **local LLM** and **AdMob**.
Remaining for a real ship: register the native LLM + ad SDKs in a Dev Client
build and submit via EAS (see `docs/`).

## Run it
This scaffold ships **without** `node_modules` (not installed here). To run:

```bash
cd side-project
npm install          # install dependencies
npx expo start       # then press i (iOS), a (Android), or scan the QR in Expo Go
```

Type-check only (no device needed):

```bash
npm run typecheck
```

## Project layout
```
side-project/
├── app/                      # Expo Router screens (file-based routing)
│   ├── _layout.tsx           # root: providers + top-level stack
│   ├── index.tsx             # gate: onboarding vs main app
│   ├── onboarding/           # 9-step onboarding flow
│   └── (app)/                # main app behind the hamburger drawer
│       ├── _layout.tsx       # drawer nav (Home / Profile / Archive / Settings)
│       ├── index.tsx         # main screen
│       ├── archive.tsx       # cover letter archive
│       ├── profile.tsx       # profile editor
│       └── settings.tsx      # permanent AI instructions
├── src/
│   ├── ai/                   # modular AI seam (types + prompt builders + stub)
│   ├── components/           # reusable UI (Button, TextField, TagInput, ...)
│   ├── context/AppContext    # DB bootstrap + theme + onboarding gate
│   ├── db/                   # schema, connection, repositories (all SQL)
│   ├── theme/colors.ts       # design-system palette (light + dark)
│   ├── types/models.ts       # domain models (mirror DB tables)
│   └── utils/                # small helpers
├── tailwind.config.js        # NativeWind theme (brand colors)
└── MEMORY.md, memory/        # agent project memory (not app code)
```

## Architecture notes
- **Local-first / no backend:** all data in `expo-sqlite`. No auth, no cloud DB.
- **Single profile** for now; schema keeps `profile_id` FKs for future multi-profile.
- **Repositories** (`src/db/repositories.ts`) hold every SQL statement; screens
  never touch the DB directly.
- **AI is modular:** screens call `getAI()`; Phase 4 registers the real Qwen
  provider via `setAI()` with zero UI changes.

## Build order (from spec §20)
1. ✅ **Phase 1** — nav, onboarding, profile storage, main, archive UI
2. ✅ **Phase 2** — job input, cover-letter editor, export
3. ✅ **Phase 3** — AI generation (+ local template fallback), highlight editing, AI settings
4. ✅ **Phase 4** — Jina Reader ✅, model download ✅, LLM + AdMob **registered
   in code** ✅ (`src/native/registerNative.native.ts`, auto-runs in a dev/prod
   build; no-op in Expo Go/web) · app icon + splash ✅ · EAS release docs ✅
   Remaining is not code: `npm install` + `eas build` on a Mac, and your AdMob
   app ids in `app.json` (see `docs/MONETIZATION.md`).

### Where AI actually runs
Generation/editing call `getAI()`. In Expo Go / web (no native LLM) generation
falls back to a **local, non-AI template** so the whole flow is usable; editing
actions show a clear "needs the Dev Client build" message. A dev build that
registers the llama runtime (`docs/AI_MODEL.md`) makes every AI action real and
fully offline.
