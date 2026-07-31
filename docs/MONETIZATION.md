# Monetization — AdMob (Phase 4)

Ads are wired behind a modular seam (`src/ads/ads.ts` + `src/components/AdBanner.tsx`)
so the app runs ad-free in Expo Go / web and shows ads only in a native build
that registers a renderer. `<AdBanner />` is already placed on the Home screen.

The renderer is **already wired in code** — `src/native/registerNative.native.ts`
registers the banner at startup (guarded so Expo Go / web stay ad-free). The
banner uses Google **TestIds** by default and switches to your real unit id when
`EXPO_PUBLIC_ADMOB_BANNER_ID` is set. So only two external things remain, both
requiring YOUR AdMob account (I can't invent account ids):

**1. The SDK is already in `package.json`.** `npm install` pulls it in.

**2. Add your AdMob app ids to `app.json`** (the one config edit — needs your
AdMob console app ids). This must go in the `plugins` array:
```json
{
  "expo": {
    "plugins": [
      "expo-router",
      ["react-native-google-mobile-ads", {
        "androidAppId": "ca-app-pub-XXXX~XXXX",
        "iosAppId": "ca-app-pub-XXXX~XXXX"
      }]
    ]
  }
}
```
> Not added to `app.json` yet on purpose: the plugin throws at build time
> without real app ids, and it would break the currently-green Expo Go / web
> build. Paste it once you have your ids.

**3. (Optional) real banner unit id** — set `EXPO_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-XXXX/XXXX`
(e.g. in `.env` or the EAS build profile). Leave it unset to keep TestIds.

## Notes
- Use `TestIds` during development to avoid policy violations.
- Add `app-ads.txt` to your site and set it in the AdMob console.
- Keep ads out of the editor to protect the core writing experience; Home +
  archive are good placements.
