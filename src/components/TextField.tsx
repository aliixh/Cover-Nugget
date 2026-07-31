// Labeled text input. Supports single-line and multiline (description) fields.

import React from "react";
import { View } from "react-native";
import { Text, TextInput } from "../ui/serif";
import { useApp } from "../context/AppContext";

interface Props {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  optional?: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "url";
  autoCapitalize?: "none" | "sentences" | "words";
  returnKeyType?: "done" | "next" | "go" | "search" | "send";
  onSubmitEditing?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  optional,
  multiline,
  keyboardType = "default",
  autoCapitalize = "sentences",
  returnKeyType,
  onSubmitEditing,
  onFocus,
  onBlur,
}: Props) {
  const { colors } = useApp();
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-primary dark:text-dark-primary">
        {label}
        {optional ? <Text className="text-muted dark:text-dark-muted"> (optional)</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`rounded-xl border border-border bg-white/70 px-4 py-3 text-base text-ink dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink ${
          multiline ? "h-28" : ""
        }`}
        style={multiline ? { textAlignVertical: "top" } : undefined}
      />
    </View>
  );
}
