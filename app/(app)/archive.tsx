// Cover Letter Archive (spec §13): list saved letters, open to edit, rename,
// or delete.

import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, View } from "react-native";
import { Text, TextInput } from "../../src/ui/serif";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { Button } from "../../src/components/Button";
import { useApp } from "../../src/context/AppContext";
import {
  deleteCoverLetter,
  listCoverLetters,
  updateCoverLetterTitle,
} from "../../src/db/repositories";
import type { CoverLetter } from "../../src/types/models";
import { coverLetterTitle, formatMonthYear } from "../../src/utils/format";

export default function ArchiveScreen() {
  const router = useRouter();
  const { colors } = useApp();
  const [letters, setLetters] = useState<CoverLetter[]>([]);

  // Search across titles + letter text (all local, no server).
  const [query, setQuery] = useState("");

  // Rename modal state.
  const [renaming, setRenaming] = useState<CoverLetter | null>(null);
  const [renameText, setRenameText] = useState("");

  const reload = useCallback(async () => {
    setLetters(await listCoverLetters());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const confirmDelete = (letter: CoverLetter) => {
    Alert.alert("Delete cover letter?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteCoverLetter(letter.id);
          reload();
        },
      },
    ]);
  };

  const openRename = (letter: CoverLetter) => {
    setRenaming(letter);
    setRenameText(coverLetterTitle(letter));
  };

  const submitRename = async () => {
    if (renaming && renameText.trim().length > 0) {
      await updateCoverLetterTitle(renaming.id, renameText.trim());
    }
    setRenaming(null);
    reload();
  };

  const openLetter = (letter: CoverLetter) => router.push(`/editor/${letter.id}`);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? letters.filter(
        (l) =>
          coverLetterTitle(l).toLowerCase().includes(q) ||
          (l.content ?? "").toLowerCase().includes(q)
      )
    : letters;

  return (
    <ScreenContainer>
      {/* Search titles + letter text (local) */}
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search titles or keywords…"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        returnKeyType="search"
        className="mb-4 rounded-xl border border-border bg-white px-4 py-3 text-base text-ink dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink"
      />

      {letters.length === 0 ? (
        <Card>
          <Text className="text-base text-muted dark:text-dark-muted">
            Your saved cover letters will appear here.
          </Text>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <Text className="text-base text-muted dark:text-dark-muted">
            No letters match "{query.trim()}".
          </Text>
        </Card>
      ) : (
        filtered.map((letter) => (
          <Card key={letter.id} className="mb-3" onPress={() => openLetter(letter)}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-base font-semibold text-ink dark:text-dark-ink">
                  {coverLetterTitle(letter)}
                </Text>
                <Text className="mt-1 text-sm text-muted dark:text-dark-muted">
                  {formatMonthYear(letter.createdAt)}
                </Text>
              </View>
              <View className="flex-row">
                <Pressable
                  onPress={() => openRename(letter)}
                  className="mr-2 rounded-full bg-highlight px-3 py-1.5 active:opacity-70 dark:bg-dark-highlight"
                >
                  <Text className="text-primary">Rename</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(letter)}
                  className="rounded-full bg-highlight px-3 py-1.5 active:opacity-70 dark:bg-dark-highlight"
                >
                  <Text className="text-primary">Delete</Text>
                </Pressable>
              </View>
            </View>
          </Card>
        ))
      )}

      {/* Rename modal */}
      <Modal
        visible={renaming !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRenaming(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-2xl bg-background p-5 dark:bg-dark-surface">
            <Text className="mb-3 text-lg font-bold text-primary dark:text-dark-primary">
              Rename cover letter
            </Text>
            <TextInput
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Cover letter name"
              placeholderTextColor={colors.muted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submitRename}
              className="mb-4 rounded-xl border border-border bg-white p-3 text-base text-ink dark:border-dark-border dark:bg-dark-background dark:text-dark-ink"
            />
            <View className="flex-row">
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setRenaming(null)}
                className="mr-3 flex-1"
              />
              <Button label="Save" onPress={submitRename} className="flex-1" />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
