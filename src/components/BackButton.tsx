// Round back button: a bold left chevron in a soft pink circle (matches the
// sidebar highlight). Used on pushed screens (editor, export, generate).
//
// The glyph is rendered with React Native's core Text (system font) — the app's
// serif Text made the arrow look thin and sit off-center.

import React from "react";
import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { useApp } from "../context/AppContext";

export function BackButton() {
  const router = useRouter();
  const { colors } = useApp();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={10}
      className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-highlight active:opacity-70 dark:bg-dark-highlight"
    >
      <Text style={{ fontSize: 20, color: colors.primary, lineHeight: 22 }}>❮</Text>
    </Pressable>
  );
}
