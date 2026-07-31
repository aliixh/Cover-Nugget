// Entry gate. Waits for the DB to initialize, then decides where to go:
//   - no profile yet            -> onboarding
//   - profile, model missing    -> model-setup (auto-download), unless dismissed
//   - otherwise                 -> main app
// Web skips model-setup (no on-device model in a browser).

import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { useApp } from "../src/context/AppContext";
import { getModelStatus } from "../src/ai/modelManager";
import { getMeta } from "../src/db/repositories";

export default function Index() {
  const { dbReady, onboarded, colors } = useApp();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!dbReady) return;
    (async () => {
      if (!onboarded) {
        setTarget("/onboarding");
        return;
      }
      // Native only: auto-route to model setup until it's done or skipped.
      if (Platform.OS !== "web") {
        const [status, dismissed] = await Promise.all([
          getModelStatus(),
          getMeta("model_setup_done"),
        ]);
        if (!status.downloaded && dismissed !== "1") {
          setTarget("/model-setup");
          return;
        }
      }
      setTarget("/home");
    })();
  }, [dbReady, onboarded]);

  if (!dbReady || !target) {
    // Brief splash while SQLite initializes / routing is decided.
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-dark-background">
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return <Redirect href={target as any} />;
}
