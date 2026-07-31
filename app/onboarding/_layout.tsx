// Onboarding is a plain headerless stack; each step controls its own
// navigation via the OnboardingScaffold footer buttons.

import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
