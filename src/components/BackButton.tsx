// Round back button: a left arrow in a soft pink circle (matches the sidebar
// highlight). Used on pushed screens (editor, export, generate).

import React from "react";
import { Pressable } from "react-native";
import { Text } from "../ui/serif";
import { useRouter } from "expo-router";

export function BackButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={10}
      className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-highlight active:opacity-70 dark:bg-dark-highlight"
    >
      <Text className="text-xl text-primary">←</Text>
    </Pressable>
  );
}
