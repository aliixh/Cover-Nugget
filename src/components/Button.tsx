// Themed pressable button with primary / secondary / ghost variants.

import React from "react";
import { Pressable } from "react-native";
import { Text } from "../ui/serif";

type Variant = "primary" | "secondary" | "ghost";

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  className?: string;
}

// Container classes per variant (light + dark).
const containerByVariant: Record<Variant, string> = {
  primary: "bg-primary dark:bg-dark-primary",
  secondary: "bg-secondary",
  ghost: "bg-transparent border border-primary dark:border-dark-primary",
};

// Text color per variant.
const textByVariant: Record<Variant, string> = {
  primary: "text-background dark:text-dark-background",
  secondary: "text-white",
  ghost: "text-primary dark:text-dark-primary",
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  className = "",
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-2xl px-5 py-4 items-center active:opacity-80 ${containerByVariant[variant]} ${disabled ? "opacity-40" : ""} ${className}`}
    >
      <Text className={`text-base font-semibold ${textByVariant[variant]}`}>
        {label}
      </Text>
    </Pressable>
  );
}
