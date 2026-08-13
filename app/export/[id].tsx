// Export screen (spec §12). Name the file, read the letter in a cropped,
// scrollable box (copy icon in its corner), then export. PDF / Word / Docs
// share a row; the share icon sits centered below, with room underneath.

import { Ionicons } from "@expo/vector-icons";
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
        const auto =
          defaultLetterTitle(letter.company, letter.role) ||
          `Untitled ${await getCoverLetterNumber(letterId)}`;
        setAutoName(auto);
        setFileName(letter.title?.trim() || auto);
      }
    })();
  }, [letterId]);

  // Typed name, or the auto name when blank - never the previously-saved title.
  const effectiveName = () => fileName.trim() || autoName;

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
      onPress: run(() => openInGoogleDocs(content!), "Letter copied. Paste it into the new Google Doc."),
    },
  ];

  return (
    <ScreenContainer scroll={false}>
      <BackButton />

      {/* File name + copy-name icon */}
      <Text className="mb-1.5 text-sm font-medium text-primary dark:text-dark-primary">
        File name
      </Text>
      <View className="relative mb-4">
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
          className="rounded-xl border border-border bg-white/70 px-4 py-3 pr-11 text-base text-ink dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink"
        />
        <Pressable
          onPress={copyFileName}
          hitSlop={8}
          className="absolute bottom-0 right-1 top-0 items-center justify-center px-2 active:opacity-60"
        >
          <Ionicons name="copy-outline" size={20} color={colors.secondary} />
        </Pressable>
      </View>

      {/* Cropped, scrollable letter with a copy icon in the corner */}
      <View
        className="relative mb-4"
        style={{ flexBasis: "52%", flexGrow: 0, flexShrink: 1 }}
      >
        <ScrollView className="flex-1 rounded-2xl border border-border bg-white p-4 pr-10 dark:border-dark-border dark:bg-dark-surface">
          <Text className="text-sm leading-6 text-ink dark:text-dark-ink">{content ?? "…"}</Text>
        </ScrollView>
        <Pressable
          onPress={copyLetter}
          hitSlop={8}
          className="absolute right-3 top-3 items-center justify-center active:opacity-60"
        >
          <Ionicons name="copy-outline" size={20} color={colors.secondary} />
        </Pressable>
      </View>

      {/* PDF · Word · Docs on one row */}
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

      {/* Share (icon only), centered below */}
      <Pressable
        onPress={run((name) => shareText(content!, name))}
        hitSlop={8}
        className="mt-3 h-12 w-12 items-center justify-center self-center rounded-full bg-primary active:opacity-80 dark:bg-dark-primary"
      >
        <Ionicons name="share-outline" size={22} color={colors.background} />
      </Pressable>

      {/* Push Done to the bottom, leaving open space under the actions. */}
      <View className="flex-1" />

      <Button label={editingName ? "Save name" : "Done"} variant="ghost" onPress={onDone} />
    </ScreenContainer>
  );
}
