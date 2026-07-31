// Onboarding entry: go straight to Personal Information (the first real step).
// (The old standalone welcome screen was removed so onboarding opens on the
// form the user actually fills in.)

import { Redirect } from "expo-router";

export default function OnboardingIndex() {
  return <Redirect href="/onboarding/personal" />;
}
