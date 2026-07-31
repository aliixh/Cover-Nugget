# Running Cover Nugget (no publishing needed)

Dependencies are already installed and the app builds (web bundle verified).
All commands run from the `side-project/` folder.

```bash
cd side-project
```

## 1. Web (fastest — just a browser)
```bash
npm run web
# or: npx expo start --web
```
Opens at **http://localhost:8081**. If `expo start` is already running, just
press **w** in that terminal to open web.

> The full UI works on web. On-device model **download/inference** is
> mobile-only (browsers can't store/run the local LLM) — the AI Model screen
> says so.

## 2. Start the dev server (for phones & emulators)
```bash
npm start
# = npx expo start  → shows a QR code + a menu of keys
```
Keys in that terminal:
- **w** — open web
- **a** — open Android emulator
- **i** — open iOS simulator (macOS only)

## 3. Android emulator
1. Install **Android Studio**, create a virtual device (AVD), and start it.
2. `npm start`, then press **a** (or `npm run android`).

## 4. iOS simulator (macOS only)
1. Install **Xcode** + Command Line Tools.
2. `npm start`, then press **i** (or `npm run ios`).

## 5. Your physical iPhone (no publishing) — via Expo Go
1. Install **Expo Go** from the App Store.
2. Put the phone on the **same Wi-Fi** as this computer.
3. `npm start`, then **scan the QR code** with the iPhone Camera → opens in Expo Go.
   - Different networks / restrictive Wi-Fi? Use a tunnel:
     ```bash
     npx expo start --tunnel
     ```

## 6. On-device LLM (the important bit)
- **Downloading the model** works in Expo Go and dev builds: open the **AI Model**
  screen (drawer ☰) → **Download model**. A first-run banner on Home links there too.
- **Running the model** needs a **Dev Client build** (Expo Go can't load the
  native LLM engine). Full steps in [`docs/AI_MODEL.md`](docs/AI_MODEL.md):
  ```bash
  npx expo install llama.rn expo-dev-client
  eas build --profile development --platform ios   # or android
  ```
  Then register the runtime (snippet in docs/AI_MODEL.md) and inference runs
  fully offline on the device.

## Type-check (no device)
```bash
npm run typecheck
```

## Troubleshooting
- Stuck bundler / weird cache: `npx expo start -c` (clears Metro cache).
- Port busy: `npx expo start --port 8082`.
- iPhone can't connect over LAN: use `--tunnel`.
