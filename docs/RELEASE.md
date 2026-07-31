# Releasing Cover Nugget (Phase 4)

The app is local-first (no backend), so release is just native builds + store
submission via **EAS**. On-device LLM inference and AdMob both require a native
build (not Expo Go) — see the checklist.

## Prerequisites
```bash
npm i -g eas-cli
eas login
```
Identifiers are already set in `app.json` (`com.covernugget.app`), and the app
**icon + adaptive icon + splash + favicon** are generated under `assets/`
(regenerate any time with `node assets/gen-icons.mjs`).

## Dev Client build (needed for on-device AI + ads testing)
```bash
npm install                                         # pulls llama.rn + dev-client + ads (already in package.json)
eas build --profile development --platform ios      # or android
```
Install the resulting build on a device/simulator, then `npx expo start
--dev-client`. The LLM runtime and ad renderer are **already wired** and
register themselves automatically in this build (`src/native/registerNative.native.ts`)
— no code to add. AdMob still needs your app ids in `app.json` (see
`docs/MONETIZATION.md`).

## Production build + submit
```bash
eas build --profile production --platform ios       # or android / all
eas submit --profile production --platform ios      # after the build finishes
```

## Store checklist
- [x] App icon (1024²) + adaptive icon + splash + favicon (`assets/`)
- [ ] Privacy policy URL (emphasize: profile + letters stay **on-device**, the
      AI model runs locally; only the optional "Open in Google Docs" and the
      Jina job-link reader make network calls)
- [ ] Apple: data-collection disclosures (minimal — no account, no server)
- [ ] Screenshots for required device sizes
- [ ] AdMob app-ads.txt + ad unit ids wired (see MONETIZATION.md)
- [ ] Model download tested on cellular + Wi-Fi (size warning shown)

## Phasing the model into the install
`app/model-setup.tsx` auto-downloads the model on first launch. To make it part
of the store download instead, use **Android Play Asset Delivery** (`fast-follow`)
or **iOS On-Demand Resources** — native config layered on the production build.
