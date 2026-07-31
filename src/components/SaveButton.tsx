// A single "Save" button that briefly shows "✓ Saved" after a successful save.
// Used across Profile tabs so every section saves the same way.

import React, { useRef, useState } from "react";
import { Pressable } from "react-native";
import { Text } from "../ui/serif";

export function SaveButton({
  onSave,
  className = "",
}: {
  onSave: () => Promise<boolean | void> | boolean | void;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPress = async () => {
    const ok = await onSave();
    if (ok === false) return; // validation failed — don't show the tick
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 1800);
  };

  return (
    <Pressable
      onPress={onPress}
      className={`items-center rounded-2xl px-5 py-3 active:opacity-80 ${
        saved ? "bg-secondary" : "bg-primary dark:bg-dark-primary"
      } ${className}`}
    >
      <Text
        className={`text-base font-semibold ${
          saved ? "text-white" : "text-background dark:text-dark-background"
        }`}
      >
        {saved ? "✓ Saved" : "Save"}
      </Text>
    </Pressable>
  );
}
