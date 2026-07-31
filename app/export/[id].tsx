// Export screen (spec §12). Name the file, read the FULL letter in a large
// scrollable box with a copy button in its corner, then export. PDF / Word /
// Google Docs share a row; Share sits centered below.

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Keyboard, Pressable, ScrollView, View } from "react-native";
import { Text, TextInput } from "../../src/ui/serif";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { BackButton } from "../../src/components/BackButton";
import { Button } from "../../src/components/Button";
import { useApp } from "../../src/context/AppContext";
import {
  getCoverLetter,
  getCoverLetterNumber,
  defaultLetterTitle,
  updateCoverLetterTitle,
} from "../../src/db/repositories";
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
  const { colors } = useApp();
  const [content, setContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [autoName, setAutoName] = useState("Untitled");
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    (async () => {
      const letter = await getCoverLetter(letterId);
      setContent(letter?.content ?? "");
      if (letter) {
        // Auto name: company + role, else "Untitled N" (N = the letter's number).
        const auto =
          defaultLetterTitle(letter.company, letter.role) ||
          `Untitled ${await getCoverLetterNumber(letterId)}`;
        setAutoName(auto);
        setFileName(letter.title?.trim() || auto);
      }
    })();
  }, [letterId]);

  // The name we'll actually use: the typed name, or the auto name when blank —
  // never the previously-saved title. So clearing the field yields "Untitled N"
  // (or company + role), not the old name.
  const effectiveName = () => fileName.trim() || autoName;

  const saveName = async () => {
    await updateCoverLetterTitle(letterId, effectiveName());
  };

  // Done: while editing the name, save + close keyboard + stay; else go home.
  const onDone = async () => {
    if (editingName) {
      const eff = effectiveName();
      setFileName(eff);
      await updateCoverLetterTitle(letterId, eff);
      Keyboard.dismiss();
      setEditingName(false);
      return;
    }
    router.replace("/home");
  };

  // Persist the effective name, then run the export action with it.
  const run =
    (fn: (name: string) => Promise<void>, successMsg?: string) => async () => {
      if (content == null) return;
      const name = effectiveName();
      try {
        await updateCoverLetterTitle(letterId, name);
        await fn(name);
        if (successMsg) Alert.alert("Done", successMsg);
      } catch (e: any) {
        Alert.alert("Couldn't export", e?.message ?? "Try again.");
      }
    };

  const copyLetter = async () => {
    if (content == null) return;
    await copyText(content);
    Alert.alert("Copied", "The letter was copied to your clipboard.");
  };
  const copyFileName = async () => {
    await copyText(effectiveName());
    Alert.alert("Copied", "The file name was copied to your clipboard.");
  };

  const fileActions: { label: string; onPress: () => void }[] = [
    { label: "PDF", onPress: run((name) => exportPdf(content!, name)) },
    { label: "Word", onPress: run((name) => exportWord(content!, name)) },
    {
      label: "Docs",
      onPress: run(() => openInGoogleDocs(content!), "Letter copied — paste it into the new Google Doc."),
    },
  ];

  return (
    <ScreenContainer scroll={false}>
      <BackButton />

      {/* File name + copy-name button */}
      <Text className="mb-1.5 text-sm font-medium text-primary dark:text-dark-primary">
        File name
      </Text>
      <View className="mb-4 flex-row items-center">
        <TextInput
          value={fileName}
          onChangeText={setFileName}
          placeholder={autoName}
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          onFocus={() => setEditingName(true)}
          onBlur={() => {
            setEditingName(false);
            const eff = effectiveName();
            setFileName(eff);
            void updateCoverLetterTitle(letterId, eff);
          }}
          onSubmitEditing={() => {
            const eff = effectiveName();
            setFileName(eff);
            void updateCoverLetterTitle(letterId, eff);
            Keyboard.dismiss();
          }}
          className="flex-1 rounded-xl border border-border bg-white/70 px-4 py-3 text-base text-ink dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink"
        />
        <Pressable
          onPress={copyFileName}
          hitSlop={8}
          className="ml-2 h-11 w-11 items-center justify-center rounded-xl bg-highlight active:opacity-70 dark:bg-dark-highlight"
        >
          <Text className="text-lg">📋</Text>
        </Pressable>
      </View>

      {/* Full letter with a copy button in the top-right corner */}
      <View className="relative mb-3 flex-1">
        <ScrollView className="flex-1 rounded-2xl border border-border bg-white p-4 pt-12 dark:border-dark-border dark:bg-dark-surface">
          <Text className="text-sm leading-6 text-ink dark:text-dark-ink">{content ?? "…"}</Text>
        </ScrollView>
        <Pressable
          onPress={copyLetter}
          hitSlop={8}
          className="absolute right-2 top-2 h-9 flex-row items-center rounded-full bg-highlight px-3 active:opacity-70 dark:bg-dark-highlight"
        >
          <Text className="mr-1 text-base">📋</Text>
          <Text className="text-sm font-semibold text-primary">Copy</Text>
        </Pressable>
      </View>

      {/* PDF · Word · Google Docs on one row */}
      <View className="flex-row">
        {fileActions.map((a, i) => (
          <Pressable
            key={a.label}
            onPress={a.onPress}
            className={`items-center rounded-xl bg-secondary px-2 py-3 active:opacity-80 ${
              i < fileActions.length - 1 ? "mr-2" : ""
            } flex-1`}
          >
            <Text className="text-sm font-semibold text-white">{a.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Share, centered below */}
      <Pressable
        onPress={run((name) => shareText(content!, name))}
        className="mt-2 flex-row items-center self-center rounded-xl bg-primary px-8 py-3 active:opacity-80 dark:bg-dark-primary"
      >
        <Text className="mr-2 text-base">📤</Text>
        <Text className="text-sm font-semibold text-background dark:text-dark-background">Share</Text>
      </Pressable>

      <Button
        label={editingName ? "Save name" : "Done"}
        variant="ghost"
        onPress={onDone}
        className="mt-2"
      />
    </ScreenContainer>
  );
}
