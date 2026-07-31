// Compact, categorized AI edit toolbar for the editor.
//  - A "Selection | Whole letter" scope toggle.
//  - Categories (Length / Tone / Grammar / Custom); tapping one reveals its
//    detailed options, so the bar stays small.
// Selection actions apply to the highlighted span; Whole actions rewrite the
// whole letter. Custom opens the free-text modal.

import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "../ui/serif";
import type { SelectionAction } from "../ai/types";

export type EditScope = "selection" | "whole";
export type EditCategory = "length" | "tone" | "grammar" | "custom";

const CATEGORIES: { key: EditCategory; label: string }[] = [
  { key: "length", label: "Length" },
  { key: "tone", label: "Tone" },
  { key: "grammar", label: "Grammar" },
  { key: "custom", label: "Custom" },
];

const SELECTION_OPTS: Record<
  Exclude<EditCategory, "custom">,
  { label: string; action: SelectionAction }[]
> = {
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

const WHOLE_OPTS: Record<
  Exclude<EditCategory, "custom">,
  { label: string; instruction: string }[]
> = {
  length: [{ label: "Shorter", instruction: "Make the entire letter shorter." }],
  tone: [
    { label: "More professional", instruction: "Make the entire letter more professional." },
    { label: "More enthusiastic", instruction: "Make the entire letter more enthusiastic." },
    { label: "More casual", instruction: "Make the entire letter more casual." },
    { label: "More technical", instruction: "Make the entire letter more technical." },
    { label: "More formal", instruction: "Make the entire letter more formal." },
  ],
  grammar: [
    { label: "Fix grammar", instruction: "Fix grammar and spelling across the whole letter." },
    { label: "Simplify", instruction: "Simplify the whole letter to be easier to read." },
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
        active
          ? "border-accent bg-accent"
          : "border-primary dark:border-dark-primary"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <Text
        className={`text-sm font-medium ${
          active ? "text-white" : "text-primary dark:text-dark-ink"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface Props {
  scope: EditScope;
  setScope: (s: EditScope) => void;
  openCat: EditCategory | null;
  setOpenCat: (c: EditCategory | null) => void;
  hasSelection: boolean;
  disabled?: boolean;
  onSelectionAction: (a: SelectionAction) => void;
  onWholeAction: (instruction: string) => void;
  onCustom: () => void;
}

export function EditToolbar({
  scope,
  setScope,
  openCat,
  setOpenCat,
  hasSelection,
  disabled,
  onSelectionAction,
  onWholeAction,
  onCustom,
}: Props) {
  const selection = scope === "selection";

  return (
    <View>
      {/* Scope toggle */}
      <View className="mb-3 flex-row rounded-xl bg-highlight p-1 dark:bg-dark-surface">
        {(["selection", "whole"] as EditScope[]).map((s) => {
          const active = scope === s;
          return (
            <Pressable
              key={s}
              onPress={() => setScope(s)}
              className={`flex-1 rounded-lg py-2 ${active ? "bg-primary dark:bg-dark-primary" : ""}`}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  active
                    ? "text-background dark:text-dark-background"
                    : "text-primary dark:text-dark-ink"
                }`}
              >
                {s === "selection" ? "Selection" : "Whole letter"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selection ? (
        <Text className="mb-2 text-xs text-muted dark:text-dark-muted">
          {hasSelection ? "Editing your highlighted text" : "Highlight text above first"}
        </Text>
      ) : null}

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

      {/* Detailed options for the open category */}
      {openCat && openCat !== "custom" ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-1 flex-row">
          {(selection ? SELECTION_OPTS[openCat] : WHOLE_OPTS[openCat]).map((o: any) => (
            <Chip
              key={o.label}
              label={o.label}
              disabled={disabled}
              onPress={() =>
                selection ? onSelectionAction(o.action) : onWholeAction(o.instruction)
              }
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
