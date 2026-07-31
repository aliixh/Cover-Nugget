// Root layout for the whole app.
//  - Imports the compiled Tailwind stylesheet (NativeWind).
//  - Wraps everything in GestureHandlerRootView (required by the drawer) and
//    SafeAreaProvider.
//  - Provides AppContext (DB bootstrap + theme + onboarding gate).
//  - Declares the top-level Stack: the onboarding flow and the main (drawer) app.

import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "../src/context/AppContext";
import { registerNative } from "../src/native/registerNative";

// The app-wide serif font is applied by the wrapped Text/TextInput in
// src/ui/serif.tsx (RN 0.81's Text has no `.render` to monkey-patch).

// Register the on-device LLM + AdMob native modules once at startup. No-op on
// web / Expo Go; a Dev Client or production build wires the real engines here.
registerNative();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="auto" />
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
