// Simple determinate progress bar. `value` is 0..1.

import React from "react";
import { View } from "react-native";

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View className="h-3 w-full overflow-hidden rounded-full bg-highlight dark:bg-dark-surface">
      {/* Width is dynamic, so it uses an inline style rather than a class. */}
      <View className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
    </View>
  );
}
