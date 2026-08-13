// Skills-style tag editor: type a value, press "Add" (or return), tap a chip
// to remove it. Purely controlled by the parent via `tags` + callbacks.

import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Text, TextInput } from "../ui/serif";
import { useApp } from "../context/AppContext";

interface Props {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
}

export function TagInput({ tags, onAdd, onRemove, placeholder }: Props) {
  const { colors } = useApp();
  const [draft, setDraft] = useState("");

  const commit = () => {
    const t = draft.trim();
    if (t.length === 0) return;
    onAdd(t);
    setDraft("");
  };

  return (
    <View>
      <View className="mb-3 flex-row items-center">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={commit}
          returnKeyType="done"
          placeholder={placeholder ?? "Add a skill"}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          className="mr-2 flex-1 rounded-xl border border-border bg-white/70 px-4 py-3 text-base text-ink dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink"
        />
        <Pressable
          onPress={commit}
          className="rounded-xl bg-primary px-4 py-3 active:opacity-80 dark:bg-dark-primary"
        >
          <Text className="font-semibold text-background dark:text-dark-background">
            Add
          </Text>
        </Pressable>
      </View>

      {/* Chip list - wraps to multiple rows. */}
      <View className="flex-row flex-wrap">
        {tags.map((tag, i) => (
          <Pressable
            key={`${tag}-${i}`}
            onPress={() => onRemove(i)}
            className="mb-2 mr-2 flex-row items-center rounded-full bg-highlight px-3 py-1.5 active:opacity-70 dark:bg-dark-highlight"
          >
            <Text className="text-sm font-medium text-primary">{tag}</Text>
            <Text className="ml-2 text-sm text-primary">×</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
