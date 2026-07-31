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
    { label: "Expand", action: "expand" },
    { label: "Remove", action: "remove" },
  ],
  tone: [
    { label: "More formal", action: "more-formal" },
    { label: "Less formal", action: "less-formal" },
    { label: "More confident", action: "more-confident" },
    { label: "More enthusiastic", action: "more-enthusiastic" },
    { label: "More playful", action: "more-playful" },
    { label: "More sincere", action: "more-sincere" },
    { label: "More personal", action: "more-personal" },
    { label: "More grateful", action: "more-grateful" },
  ],
  grammar: [
    { label: "Simplify", action: "simplify" },
    { label: "Change structure", action: "change-structure" },
    { label: "Rephrase", action: "rephrase" },
    { label: "Active voice", action: "active-voice" },
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
  openCat: EditCategory | null;
  setOpenCat: (c: EditCategory | null) => void;
  disabled?: boolean;
  onSelectionAction: (a: SelectionAction) => void;
  onCustom: () => void;
}

export function EditToolbar({
  selectedCount,
  openCat,
  setOpenCat,
  disabled,
  onSelectionAction,
  onCustom,
}: Props) {
  const hasSel = selectedCount > 0;

  return (
    <View>
      {/* Selection count / hint */}
      <Text className="mb-2 text-sm text-muted dark:text-dark-muted">
        {hasSel
          ? `${selectedCount} sentence${selectedCount === 1 ? "" : "s"} selected — pick a change`
          : "Tap sentences to select, then pick a change"}
      </Text>

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
