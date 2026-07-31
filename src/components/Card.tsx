// Rounded surface card used for list items (experiences, letters, etc.).

import React from "react";
import { Pressable, View } from "react-native";

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
}

export function Card({ children, onPress, className = "" }: Props) {
  const classes = `rounded-2xl border border-border bg-white p-4 dark:border-dark-border dark:bg-dark-surface ${className}`;
  if (onPress) {
    return (
      <Pressable onPress={onPress} className={`${classes} active:opacity-80`}>
        {children}
      </Pressable>
    );
  }
  return <View className={classes}>{children}</View>;
}
