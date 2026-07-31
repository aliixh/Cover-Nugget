# Cover Nugget 🦖🍗

**Cover Nugget** is a privacy-first, **local-first** AI cover-letter generator for
iOS and Android. You keep a profile once, paste a job link or description, and it
writes a tailored cover letter you can restyle, edit sentence-by-sentence, and
export — all **on your device**. Nothing is uploaded; there's no account and no
server.

Built with React Native + Expo (TypeScript), NativeWind (Tailwind), Expo Router,
and `expo-sqlite`. The optional writing model runs **entirely on-device**.

---

## Features

### ✍️ Generate
- Provide a job by **link** or by **pasting the description**.
- **On-device scraper** (no server): fetches the posting from your phone's own
  connection and pulls the clean description from `JobPosting` structured data or
  the page body. Works on most company career pages, Greenhouse, Lever, and
  Ashby. (Indeed/LinkedIn block automated reading — paste those instead.)
- **Auto-detects Company & Role** from the link or pasted text and fills them in
  (still editable), so the letter and file name are right without extra typing.
- Optional **length limit** (words or characters), enforced *before* you see the
  letter — our own counter checks, and the model re-shortens until it fits.

### 🎨 8 letter formats (cycle instantly, no model needed)
Tap **Format** in the editor to cycle through layouts. Switching rebuilds the
header/date/sign-off from your profile and **preserves your body text**:

| Format | Feel |
| --- | --- |
| Classic Block | Standard full-block business letter |
| Modern Compact | Two-line header, no date block |
| Formal | Stacked sender block + date, traditional |
| Email Style | No top header — contact sits under your signature |
| Semi-Block | Indented paragraphs |
| Minimalist | Uppercase name, bullet-separated contact |
| Executive | Uppercase letterhead, rule line, "Re:" subject line |
| Creative | Sparkle-separated contact, dot section break, warm sign-off |

### 🖊️ Editor
- **Tap sentences to select** them (one or many) — no keyboard pops up — then
  apply an AI change to all selected at once. **Select all** in one tap.
- Edit categories: **Length** (Shorten / Expand / Remove), **Tone** (formal,
  confident, enthusiastic, playful, sincere, personal, grateful, …),
  **Grammar** (Simplify / Change structure / Rephrase / Active voice), **Custom**.
- **"Edit myself"** mode for manual typing, with a **Done → Save / Revert**
  prompt so you can always roll back to the pre-edit version.
- Live word/char count under the letter.

### 📤 Export
- **Times New Roman, 12 pt, 1-inch margins** — a clean standard letter.
- **PDF**, **Word (.doc)**, **Google Docs**, **Copy**, and **Share**.
- Smart file naming: **Company — Role**, or **"Untitled N"** when unknown; never
  silently reverts to an old name.

### 👤 Profile
- Sections for personal info, skills, experience, education, projects,
  certifications, and more — as **swipeable tabs** (swipe or tap).
- The generator only uses profile details **relevant to the specific job**.

### ⚙️ Settings — your writing rules
- Add permanent **writing instructions** (e.g. "never use the word passionate",
  "keep it under 250 words"). They're injected into every generation and edit so
  the model follows your voice.

### 🔒 Privacy
- **Everything stays on the device.** Profile and letters live in local SQLite.
- No account, no analytics, no cloud. The optional model runs offline.

---

## The on-device model
- The writing model is **not** bundled in the app; it's downloaded once (~469 MB)
  from the **Your Assistant** screen, then runs fully offline.
- **Where it runs:** actual inference needs a Dev Client / production build. In
  **Expo Go** (or web) there's no native model, so generation falls back to a
  built-in **template** (still tailored to the job) and AI edits show a clear
  "needs the full app" message. The whole flow stays usable without the model.

---

## Getting started

Requires Node 18+ and the Expo tooling.

```bash
cd side-project
npm install          # install dependencies (needed after pulling)
npx expo start       # press i (iOS), a (Android), or scan the QR in Expo Go
```

Type-check without a device:

```bash
npm run typecheck
```

Verify a production JS bundle builds:

```bash
npx expo export --platform ios
```

> **Optional job-search backend** (`server/`): a small FastAPI service
> (trafilatura + JobSpy) you can self-host and point the app at via
> `EXPO_PUBLIC_JOBS_API`. The on-device scraper works without it — the backend
> is only a fallback for tricky pages. See `server/DEPLOY.md`.

---

## Project structure

```
side-project/
├── app/                       # Expo Router screens (file-based routing)
│   ├── _layout.tsx            # root providers + stack
│   ├── index.tsx              # gate: welcome/onboarding vs main app
│   ├── onboarding/            # welcome + step-by-step profile setup
│   ├── generate.tsx           # job input + generate
│   ├── editor/[id].tsx        # the sentence-select / edit-myself editor
│   ├── export/[id].tsx        # naming + PDF/Word/Docs/Copy/Share
│   └── (app)/                 # main app behind the drawer
│       ├── home.tsx  archive.tsx  profile.tsx  settings.tsx  model.tsx
├── src/
│   ├── ai/                    # prompt builders + provider seam + model config
│   ├── components/            # reusable UI (Button, TextField, EditToolbar, …)
│   ├── context/AppContext     # DB bootstrap + theme + onboarding gate
│   ├── db/                    # schema, migrations, repositories (all SQL)
│   ├── job/jina.ts            # on-device scraper + company/role detection
│   ├── services/              # coverLetter, letterFormat, export
│   ├── theme/colors.ts        # light + dark palette
│   ├── types/models.ts        # domain models (mirror DB tables)
│   └── utils/                 # counters, sentence tokenizer, formatting
├── assets/brand/              # drop the dino-nugget logo here (see its README)
├── server/                    # optional FastAPI job-fetch backend
├── tailwind.config.js         # NativeWind theme (brand colors)
└── README.md
```

## Architecture notes
- **Local-first / no backend:** all data in `expo-sqlite`; repositories
  (`src/db/repositories.ts`) hold every SQL statement — screens never touch the
  DB directly. Schema changes are additive migrations (`src/db/database.ts`).
- **AI is modular:** screens call `getAI()`; a dev build registers the real
  on-device provider (`src/native/registerNative.native.ts`) with no UI changes.
- **Formats are pure functions** (`src/services/letterFormat.ts`): each rebuilds
  the scaffolding around your body text, so cycling is instant and lossless.

## Roadmap
- Ship a Dev Client / production build (EAS) to enable the on-device model.
- Brand: replace the 🦖🍗 emoji with the dino-nugget logo (see `assets/brand/`).
- Ideas under consideration: application tracker, résumé import, ATS/job-match
  check, backup & restore.
