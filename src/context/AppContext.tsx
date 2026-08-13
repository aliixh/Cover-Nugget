// App-wide context: database bootstrap, active color palette, and the
// onboarding gate. Wrapped around the whole app in app/_layout.tsx.

import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "nativewind";
import { initDatabase } from "../db/database";
import { getMeta, hasProfile, setMeta } from "../db/repositories";
import { getColors, type AppColors } from "../theme/colors";

/** User's appearance choice. "system" follows the device. */
export type ThemePref = "light" | "dark" | "system";

interface AppContextValue {
  /** True once the SQLite schema has been created. */
  dbReady: boolean;
  /** Whether a profile exists (drives the onboarding redirect). */
  onboarded: boolean;
  /** Re-checks whether a profile exists (call after finishing onboarding). */
  refreshOnboarded: () => Promise<void>;
  /** Raw color values for the active scheme (for non-className surfaces). */
  colors: AppColors;
  /** "light" | "dark" - the resolved scheme. */
  scheme: "light" | "dark";
  /** The user's saved appearance preference. */
  themePref: ThemePref;
  /** Change + persist the appearance preference. */
  setThemePref: (pref: ThemePref) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [dbReady, setDbReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [themePref, setThemePrefState] = useState<ThemePref>("system");

  // One-time database bootstrap + onboarding check + saved appearance.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initDatabase();
      const [exists, savedPref] = await Promise.all([
        hasProfile(),
        getMeta("theme_pref"),
      ]);
      if (!cancelled) {
        const pref = (savedPref as ThemePref) || "system";
        setThemePrefState(pref);
        setColorScheme(pref);
        setOnboarded(exists);
        setDbReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setColorScheme]);

  const refreshOnboarded = async () => {
    setOnboarded(await hasProfile());
  };

  const setThemePref = (pref: ThemePref) => {
    setThemePrefState(pref);
    setColorScheme(pref);
    void setMeta("theme_pref", pref);
  };

  const scheme: "light" | "dark" = colorScheme === "dark" ? "dark" : "light";

  return (
    <AppContext.Provider
      value={{
        dbReady,
        onboarded,
        refreshOnboarded,
        colors: getColors(scheme),
        scheme,
        themePref,
        setThemePref,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/** Hook to read app context; throws if used outside the provider. */
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
