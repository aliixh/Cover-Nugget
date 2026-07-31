// Export screen (spec §12). Name the file, read the FULL letter in a large
// scrollable box, then copy/export. Actions sit at the bottom, side by side.

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { Text } from "../../src/ui/serif";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { BackButton } from "../../src/components/BackButton";
import { Button } from "../../src/components/Button";
import { TextField } from "../../src/components/TextField";
import { getCoverLetter, updateCoverLetterTitle } from "../../src/db/repositories";
import { coverLetterTitle } from "../../src/utils/format";
import {
  copyText,
  exportPdf,
  exportWord,
  openInGoogleDocs,
  shareText,
} from "../../src/services/export";

export default function ExportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const letterId = Number(id);
  const router = useRouter();
  const [content, setContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    (async () => {
      const letter = await getCoverLetter(letterId);
      setContent(letter?.content ?? "");
      if (letter) setFileName(coverLetterTitle(letter));
    })();
  }, [letterId]);

  // Persist the (possibly edited) name to the archive, then run the action.
  const run =
    (fn: (name: string) => Promise<void>, successMsg?: string) => async () => {
      if (content == null) return;
      const name = fileName.trim();
      try {
        if (name) await updateCoverLetterTitle(letterId, name);
        await fn(name);
        if (successMsg) Alert.alert("Done", successMsg);
      } catch (e: any) {
        Alert.alert("Couldn't export", e?.message ?? "Try again.");
      }
    };

  const actions: { label: string; primary?: boolean; onPress: () => void }[] = [
    { label: "Copy", primary: true, onPress: run(() => copyText(content!), "Copied to clipboard.") },
    { label: "PDF", onPress: run((name) => exportPdf(content!, name)) },
    { label: "Word", onPress: run((name) => exportWord(content!, name)) },
    { label: "Google Docs", onPress: run(() => openInGoogleDocs(content!), "Letter copied — paste it into the new doc.") },
    { label: "Share", onPress: run((name) => shareText(content!, name)) },
  ];

  return (
    <ScreenContainer scroll={false}>
      <BackButton />
      <TextField
        label="File name"
        value={fileName}
        onChangeText={setFileName}
        placeholder="e.g. Google — Software Engineer"
      />

      {/* Full letter, scrollable, fills the screen */}
      <ScrollView className="mb-3 flex-1 rounded-2xl border border-border bg-white p-4 dark:border-dark-border dark:bg-dark-surface">
        <Text className="text-sm leading-6 text-ink dark:text-dark-ink">
          {content ?? "…"}
        </Text>
      </ScrollView>

      {/* Actions, side by side */}
      <View className="flex-row flex-wrap justify-between">
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={a.onPress}
            className={`mb-2 w-[48%] items-center rounded-xl px-3 py-3 active:opacity-80 ${
              a.primary ? "bg-primary dark:bg-dark-primary" : "bg-secondary"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                a.primary ? "text-background dark:text-dark-background" : "text-white"
              }`}
            >
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Button label="Done" variant="ghost" onPress={() => router.replace("/home")} className="mt-1" />
    </ScreenContainer>
  );
}
