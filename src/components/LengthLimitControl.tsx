// Per-letter length-limit control: a toggle, a Words/Characters switch, and a
// number. The limit is enforced by our own counter (src/utils/textStats) and,
// when the model is available, the letter is quietly shortened to fit.

import React from "react";
import { Pressable, Switch, View } from "react-native";
import { Text, TextInput } from "../ui/serif";
import { useApp } from "../context/AppContext";
import type { LimitType } from "../utils/textStats";

export interface LimitState {
  enabled: boolean;
  type: LimitType;
  value: number;
}

export function LengthLimitControl({
  state,
  onChange,
}: {
  state: LimitState;
  onChange: (s: LimitState) => void;
}) {
  const { colors } = useApp();
  return (
    <View className="mb-3 rounded-xl border border-border p-3 dark:border-dark-border">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-primary dark:text-dark-primary">
          Set length limit
        </Text>
        <Switch
          value={state.enabled}
          onValueChange={(v) => onChange({ ...state, enabled: v })}
          trackColor={{ true: colors.accent }}
        />
      </View>

      {state.enabled ? (
        <View className="mt-3 flex-row items-center">
          <View className="mr-3 flex-row rounded-lg bg-highlight p-1 dark:bg-dark-surface">
            {(["word", "char"] as LimitType[]).map((t) => {
              const active = state.type === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => onChange({ ...state, type: t })}
                  className={`rounded-md px-3 py-1 ${
                    active ? "bg-primary dark:bg-dark-primary" : ""
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      active
                        ? "text-background dark:text-dark-background"
                        : "text-primary dark:text-dark-ink"
                    }`}
                  >
                    {t === "word" ? "Words" : "Chars"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={state.value ? String(state.value) : ""}
            onChangeText={(t) => {
              const n = parseInt(t.replace(/[^0-9]/g, ""), 10);
              onChange({ ...state, value: Number.isNaN(n) ? 0 : n });
            }}
            keyboardType="number-pad"
            placeholder="300"
            placeholderTextColor={colors.muted}
            className="w-24 rounded-lg border border-border px-3 py-2 text-base text-ink dark:border-dark-border dark:text-dark-ink"
          />
          <Text className="ml-2 text-sm text-muted dark:text-dark-muted">
            {state.type === "word" ? "words max" : "chars max"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
