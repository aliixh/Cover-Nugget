// Standard screen wrapper: safe-area padding + themed background + optional
// scrolling. Keyboard-aware so form fields aren't hidden behind the keyboard.

import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  children: React.ReactNode;
  /** When true (default) content scrolls; set false for fl*ex layouts. */
  scroll?: boolean;
  /** Extra classes for the inner content container. */
  className?: string;
}

export function ScreenContainer({ children, scroll = true, className = "" }: Props) {
  const inner = (
    <View className={`flex-1 px-8 py-4 ${className}`}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-background dark:bg-dark-background"
    >
      {scroll ? (
        // `automaticallyAdjustKeyboardInsets` insets the scroll content by the
        // keyboard height, so the focused field scrolls into view instead of
        // sitting under the keyboard (which clipped the bottom of the text).
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          {inner}
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {inner}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
