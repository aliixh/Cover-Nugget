// Main screen (spec §4): primary "Generate Cover Letter" action + a list of
// recent cover letters. Lives at /home (the drawer's first screen). The
// generate flow itself lands in Phase 2, so the button currently explains that.

import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { Text } from "../../src/ui/serif";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { AdBanner } from "../../src/components/AdBanner";
import { listCoverLetters } from "../../src/db/repositories";
import { getModelStatus } from "../../src/ai/modelManager";
import type { CoverLetter } from "../../src/types/models";
import { coverLetterTitle, formatMonthYear } from "../../src/utils/format";

export default function HomeScreen() {
  const router = useRouter();
  const [recent, setRecent] = useState<CoverLetter[]>([]);
  const [modelDownloaded, setModelDownloaded] = useState(true); // assume until checked

  // Reload the recent list + model status every time the screen regains focus.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [letters, model] = await Promise.all([
          listCoverLetters(),
          getModelStatus(),
        ]);
        if (active) {
          setRecent(letters.slice(0, 5));
          setModelDownloaded(model.downloaded);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const onGenerate = () => router.push("/generate");

  return (
    <ScreenContainer>
      <Text className="mb-1 text-2xl font-bold text-primary dark:text-dark-primary">
        Create a Cover Letter
      </Text>
      <Text className="mb-5 text-base text-secondary dark:text-dark-ink">
        Generate a personalized letter from your profile and a job posting.
      </Text>

      <Button label="Generate Cover Letter" onPress={onGenerate} className="mb-6" />

      {/* First-run nudge: guide users to download the on-device model. */}
      {!modelDownloaded ? (
        <Card className="mb-8" onPress={() => router.push("/model")}>
          <Text className="text-base font-semibold text-primary dark:text-dark-primary">
            ⬇️ Set up your assistant
          </Text>
          <Text className="mt-1 text-sm text-muted dark:text-dark-muted">
            Cover Nugget runs completely privately on your device. Download the
            model once and everything works offline — your information never
            leaves your phone.
          </Text>
        </Card>
      ) : (
        <View className="mb-2" />
      )}

      <Text className="mb-3 text-lg font-semibold text-primary dark:text-dark-primary">
        Recent Cover Letters
      </Text>

      {recent.length === 0 ? (
        <Card>
          <Text className="text-base text-muted dark:text-dark-muted">
            No cover letters yet. Generate your first one above.
          </Text>
        </Card>
      ) : (
        recent.map((letter) => (
          <Card
            key={letter.id}
            className="mb-2"
            onPress={() => router.push(`/editor/${letter.id}`)}
          >
            <Text className="text-base font-semibold text-ink dark:text-dark-ink">
              {coverLetterTitle(letter)}
            </Text>
            <Text className="text-sm text-muted dark:text-dark-muted">
              {formatMonthYear(letter.createdAt)}
            </Text>
          </Card>
        ))
      )}

      {/* Banner ad slot — renders only in a build with the ad SDK registered. */}
      <View className="mt-6 items-center">
        <AdBanner />
      </View>
    </ScreenContainer>
  );
}
