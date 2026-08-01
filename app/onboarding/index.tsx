// Onboarding welcome screen — a friendly intro shown before the first form.
// "Get started" continues into Personal Information.

import { useRouter } from "expo-router";
import { View } from "react-native";
import { Text } from "../../src/ui/serif";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Button } from "../../src/components/Button";
import { Logo } from "../../src/components/Logo";

const POINTS: { icon: string; title: string; body: string }[] = [
  {
    icon: "🔒",
    title: "Private by design",
    body: "Your profile and letters stay on your phone; nothing is uploaded.",
  },
  {
    icon: "🎯",
    title: "Tailored to each job",
    body: "Paste a link or description and get a letter matched to that role.",
  },
  {
    icon: "📄",
    title: "Yours to finish",
    body: "Tweak sentences, pick a format, then export to PDF, Word, Google Docs, or just copy.",
  },
];

export default function OnboardingWelcome() {
  const router = useRouter();

  return (
    <ScreenContainer scroll={false}>
      <View className="flex-1 justify-center">
        <Logo width={150} style={{ alignSelf: "center" }} />
        <Text className="mt-4 text-center text-4xl font-bold text-primary dark:text-dark-primary">
          Cover Nugget
        </Text>
        <Text className="mb-8 mt-2 text-center text-base text-secondary dark:text-dark-ink">
          Cover letters that actually sound like you, in a couple of taps.
        </Text>

        {POINTS.map((p) => (
          <View key={p.title} className="mb-4 flex-row items-start">
            <Text className="mr-3 text-2xl">{p.icon}</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-primary dark:text-dark-primary">
                {p.title}
              </Text>
              <Text className="text-sm text-secondary dark:text-dark-ink">{p.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className="mb-4">
        <Button label="Get started" onPress={() => router.push("/onboarding/personal")} />
        <Text className="mt-3 text-center text-xs text-muted dark:text-dark-muted">
          Just a few minutes, and only once. Skip anything you like.
        </Text>
      </View>
    </ScreenContainer>
  );
}
