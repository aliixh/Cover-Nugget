// Native-module registration — WEB / default target (no-op).
//
// Metro resolves `registerNative.native.ts` for iOS/Android and this file for
// web (and anywhere without a `.native` variant). On web there are no custom
// native modules (no on-device LLM, no AdMob), so registration is a no-op and
// the app keeps using the template fallback + empty ad slots.
export function registerNative(): void {
  // intentionally empty on web
}
