// Root layout for the whole app.
//  - Imports the compiled Tailwind stylesheet (NativeWind).
//  - Wraps everything in GestureHandlerRootView (required by the drawer) and
//    SafeAreaProvider.
//  - Provides AppContext (DB bootstrap + theme + onboarding gate).
//  - Declares the top-level Stack: the onboarding flow and the main (drawer) app.

import "../global.css";

import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "../src/context/AppContext";
import { registerNative } from "../src/native/registerNative";
import {
  useModelDownload,
  reconcileDownloadState,
  isDownloadUiFocused,
  type DownloadStatus,
} from "../src/ai/modelDownload";

// The app-wide serif font is applied by the wrapped Text/TextInput in
// src/ui/serif.tsx (RN 0.81's Text has no `.render` to monkey-patch).

// Register the on-device LLM + AdMob native modules once at startup. No-op on
// web / Expo Go; a Dev Client or production build wires the real engines here.
registerNative();

// Watches the global model download and, when it finishes while the user is on
// some other page (not a dedicated download screen), pops a "ready" notice.
function ModelDownloadWatcher() {
  const { status } = useModelDownload();
  const prev = useRef<DownloadStatus>(status);
  useEffect(() => {
    void reconcileDownloadState();
  }, []);
  useEffect(() => {
    if (prev.current === "downloading" && status === "done" && !isDownloadUiFocused()) {
      Alert.alert("AI is ready", "The model finished downloading. AI writing and editing are on.");
    }
    prev.current = status;
  }, [status]);
  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="auto" />
          <ModelDownloadWatcher />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="model-setup" />
            <Stack.Screen name="(app)" />
          </Stack>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
