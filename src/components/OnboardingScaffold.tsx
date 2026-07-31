// Shared layout for onboarding steps: a title/subtitle header, a progress
// indicator, the step's form content, and a sticky footer with
// Back / Skip / Continue actions. Keeps each onboarding page short and
// consistent (spec section 3).

import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "../ui/serif";
import { useRouter } from "expo-router";
import { ScreenContainer } from "./ScreenContainer";
import { Button } from "./Button";
import { useApp } from "../context/AppContext";
import { getOrCreateProfile } from "../db/repositories";

interface Props {
  title: string;
  subtitle?: string;
  /** 1-based current step, and total steps, for the progress dots. */
  step: number;
  total: number;
  children: React.ReactNode;
  onBack?: () => void;
  onSkip?: () => void;
  onNext: () => void;
  /** Continue button label — e.g. "Continue" or "Finish". */
  nextLabel?: string;
}

export function OnboardingScaffold({
  title,
  subtitle,
  step,
  total,
  children,
  onBack,
  onSkip,
  onNext,
  nextLabel = "Continue",
}: Props) {
  const router = useRouter();
  const { refreshOnboarded } = useApp();

  // Finish onboarding immediately, keeping whatever's been entered so far.
  const skipAll = async () => {
    await getOrCreateProfile(); // ensure a profile row exists for later editing
    await refreshOnboarded();
    router.replace("/");
  };

  return (
    <ScreenContainer>
      <View className="flex-1">
        {/* Top row: progress dots + Skip all */}
        <View className="mb-6 mt-2 flex-row items-center">
          <View className="flex-1 flex-row">
            {Array.from({ length: total }).map((_, i) => (
              <View
                key={i}
                className={`mr-1.5 h-1.5 flex-1 rounded-full ${
                  i < step ? "bg-accent" : "bg-highlight dark:bg-dark-surface"
                }`}
              />
            ))}
          </View>
          <Pressable onPress={skipAll} className="ml-3 py-1 active:opacity-60">
            <Text className="text-sm font-medium text-muted dark:text-dark-muted">
              Skip all
            </Text>
          </Pressable>
        </View>

        <Text className="text-2xl font-bold text-primary dark:text-dark-primary">
          {title}
        </Text>
        {subtitle ? (
          <Text className="mb-6 mt-1 text-base text-secondary dark:text-dark-ink">
            {subtitle}
          </Text>
        ) : (
          <View className="mb-6" />
        )}

        <View className="flex-1">{children}</View>
      </View>

      {/* Sticky footer actions (raised off the bottom edge) */}
      <View className="mt-4 mb-4 flex-row items-center">
        {onBack ? (
          <Button label="Back" variant="ghost" onPress={onBack} className="mr-3" />
        ) : null}
        <View className="flex-1" />
        {onSkip ? (
          <Button label="Skip" variant="ghost" onPress={onSkip} className="mr-3" />
        ) : null}
        <Button label={nextLabel} onPress={onNext} />
      </View>
    </ScreenContainer>
  );
}
