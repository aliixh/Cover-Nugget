// Compact AI edit toolbar for the editor.
//  - The user taps sentences in the letter to select them (no keyboard). This
//    toolbar shows "Select all / Clear" plus categorized actions that apply to
//    whatever sentences are selected.
//  - Categories (Length / Tone / Grammar / Custom); tapping one reveals its
//    options so the bar stays small. Custom opens the free-text modal.

import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "../ui/serif";
import type { SelectionAction } from "../ai/types";

export type EditCategory = "length" | "tone" | "grammar" | "custom";

const CATEGORIES: { key: EditCategory; label: string }[] = [
  { key: "length", label: "Length" },
  { key: "tone", label: "Tone" },
  { key: "grammar", label: "Grammar" },
  { key: "custom", label: "Custom" },
];

const OPTS: Record<Exclude<EditCategory, "custom">, { label: string; action: SelectionAction }[]> = {
  length: [
    { label: "Shorten", action: "shorten" },
    { label: "Remove", action: "remove" },
  ],
  tone: [
    { label: "More formal", action: "more-formal" },
    { label: "Less formal", action: "less-formal" },
    { label: "More confident", action: "more-confident" },
  ],
  grammar: [
    { label: "Fix grammar", action: "fix-grammar" },
    { label: "Simplify", action: "simplify" },
  ],
};

function Chip({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`mb-2 mr-2 rounded-full border px-3 py-1.5 active:opacity-70 ${
        active ? "border-accent bg-accent" : "border-primary dark:border-dark-primary"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <Text
        className={`text-sm font-medium ${active ? "text-white" : "text-primary dark:text-dark-ink"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface Props {
  selectedCount: number;
  totalSentences: number;
  openCat: EditCategory | null;
  setOpenCat: (c: EditCategory | null) => void;
  disabled?: boolean;
  onSelectionAction: (a: SelectionAction) => void;
  onCustom: () => void;
  onSelectAll: () => void;
  onClear: () => void;
}

export function EditToolbar({
  selectedCount,
  totalSentences,
  openCat,
  setOpenCat,
  disabled,
  onSelectionAction,
  onCustom,
  onSelectAll,
  onClear,
}: Props) {
  const hasSel = selectedCount > 0;
  const allSelected = totalSentences > 0 && selectedCount === totalSentences;

  return (
    <View>
      {/* Select all / Clear + count */}
      <View className="mb-2 flex-row items-center">
        <Pressable
          onPress={allSelected ? onClear : onSelectAll}
          disabled={disabled || totalSentences === 0}
          className="mr-2 rounded-full bg-highlight px-3 py-1.5 active:opacity-70 dark:bg-dark-highlight"
        >
          <Text className="text-sm font-semibold text-primary">
            {allSelected ? "Clear all" : "Select all"}
          </Text>
        </Pressable>
        {hasSel && !allSelected ? (
          <Pressable onPress={onClear} className="mr-2 py-1.5 active:opacity-70">
            <Text className="text-sm font-medium text-muted dark:text-dark-muted">Clear</Text>
          </Pressable>
        ) : null}
        <Text className="text-sm text-muted dark:text-dark-muted">
          {hasSel
            ? `${selectedCount} sentence${selectedCount === 1 ? "" : "s"} selected`
            : "Tap sentences to select"}
        </Text>
      </View>

      {/* Category chips */}
      <View className="flex-row flex-wrap">
        {CATEGORIES.map((c) => (
          <Chip
            key={c.key}
            label={c.label}
            active={openCat === c.key}
            disabled={disabled}
            onPress={() => {
              if (c.key === "custom") {
                onCustom();
                return;
              }
              setOpenCat(openCat === c.key ? null : c.key);
            }}
          />
        ))}
      </View>

      {/* Options for the open category */}
      {openCat && openCat !== "custom" ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          className="mt-1"
        >
          <View className="flex-row">
            {OPTS[openCat].map((o) => (
              <Chip
                key={o.label}
                label={o.label}
                disabled={disabled}
                onPress={() => onSelectionAction(o.action)}
              />
            ))}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}
