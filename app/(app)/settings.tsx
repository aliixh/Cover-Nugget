// Settings (spec §15): permanent AI instructions that will be injected into
// every generation/edit prompt once the AI module lands (Phase 3). Stored in
// the ai_settings table so they persist locally.

import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Text } from "../../src/ui/serif";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { TextField } from "../../src/components/TextField";
import { useApp, type ThemePref } from "../../src/context/AppContext";
import { wipeDatabase } from "../../src/db/database";
import {
  addAiSetting,
  listAiSettings,
  removeAiSetting,
} from "../../src/db/repositories";
import type { AiSetting } from "../../src/types/models";

const THEME_OPTIONS: { label: string; value: ThemePref }[] = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Auto", value: "system" },
];

/** Segmented Light / Dark / Auto control. */
function AppearanceToggle() {
  const { themePref, setThemePref } = useApp();
  return (
    <View className="mb-6 flex-row rounded-xl bg-highlight p-1 dark:bg-dark-surface">
      {THEME_OPTIONS.map((o) => {
        const active = themePref === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => setThemePref(o.value)}
            className={`flex-1 rounded-lg py-2.5 ${
              active ? "bg-primary dark:bg-dark-primary" : ""
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                active
                  ? "text-background dark:text-dark-background"
                  : "text-primary dark:text-dark-ink"
              }`}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// A few tappable starting points (spec examples). Length limits live per-letter
// in the editor now, so they're intentionally not suggested here.
const EXAMPLES = [
  "Always start with: Dear Hiring Manager,",
  "Never mention my GPA.",
  "Do not use overly formal language.",
];

export default function SettingsScreen() {
  const router = useRouter();
  const { refreshOnboarded } = useApp();
  const [instructions, setInstructions] = useState<AiSetting[]>([]);
  const [draft, setDraft] = useState("");

  const restartOnboarding = () => router.push("/onboarding");

  const resetApp = () => {
    Alert.alert(
      "Reset app data?",
      "This deletes your profile and all cover letters, and restarts onboarding. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await wipeDatabase();
            await refreshOnboarded();
            router.replace("/");
          },
        },
      ]
    );
  };

  const reload = useCallback(async () => {
    setInstructions(await listAiSettings());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const add = async (text: string) => {
    const t = text.trim();
    if (t.length === 0) return;
    await addAiSetting(t);
    setDraft("");
    reload();
  };

  const remove = async (id: number) => {
    await removeAiSetting(id);
    reload();
  };

  return (
    <ScreenContainer>
      <Text className="mb-3 text-2xl font-bold text-primary dark:text-dark-primary">
        Appearance
      </Text>
      <AppearanceToggle />

      <Text className="mb-1 text-2xl font-bold text-primary dark:text-dark-primary">
        Writing Instructions
      </Text>
      <Text className="mb-5 text-base text-secondary dark:text-dark-ink">
        Permanent rules applied to every cover letter you generate or edit.
      </Text>

      <TextField
        label="New instruction"
        value={draft}
        onChangeText={setDraft}
        multiline
        placeholder="e.g. Always mention my school."
      />
      <Button label="Add instruction" onPress={() => add(draft)} className="mb-6" />

      {/* Quick-add examples */}
      <Text className="mb-2 text-sm font-medium text-muted dark:text-dark-muted">Examples</Text>
      <View className="mb-6 flex-row flex-wrap">
        {EXAMPLES.map((ex) => (
          <Pressable
            key={ex}
            onPress={() => add(ex)}
            className="mb-2 mr-2 rounded-full border border-secondary px-3 py-1.5 active:opacity-70 dark:border-dark-primary"
          >
            <Text className="text-sm text-secondary dark:text-dark-ink">+ {ex}</Text>
          </Pressable>
        ))}
      </View>

      <Text className="mb-2 text-lg font-semibold text-primary dark:text-dark-primary">
        Your instructions
      </Text>
      {instructions.length === 0 ? (
        <Card>
          <Text className="text-base text-muted dark:text-dark-muted">
            No custom instructions yet. Add one above.
          </Text>
        </Card>
      ) : (
        instructions.map((ins) => (
          <Card key={ins.id} className="mb-2 flex-row items-center justify-between">
            <Text className="flex-1 pr-3 text-base text-ink dark:text-dark-ink">
              {ins.instruction}
            </Text>
            <Pressable
              onPress={() => remove(ins.id)}
              className="rounded-full bg-highlight px-3 py-1.5 active:opacity-70 dark:bg-dark-highlight"
            >
              <Text className="text-primary">Remove</Text>
            </Pressable>
          </Card>
        ))
      )}

      <Text className="mb-1 mt-8 text-2xl font-bold text-primary dark:text-dark-primary">
        App
      </Text>
      <Text className="mb-3 text-base text-secondary dark:text-dark-ink">
        Walk through onboarding again, or wipe everything and start fresh.
      </Text>
      <Button
        label="Restart onboarding"
        variant="ghost"
        onPress={restartOnboarding}
        className="mb-3"
      />
      <Button label="Reset app data" variant="secondary" onPress={resetApp} className="mb-6" />
    </ScreenContainer>
  );
}
