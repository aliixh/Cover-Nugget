// App-wide serif Text / TextInput.
//
// RN 0.81's Text is a plain function component (no `.render`), so the old
// global-font monkey-patches don't work. Instead we wrap Text/TextInput, inject
// the platform serif as the FIRST style (so className weight/size/color still
// win), and register them with NativeWind's cssInterop so `className` keeps
// working. Screens import Text/TextInput from here instead of "react-native".

import React from "react";
import {
  Text as RNText,
  TextInput as RNTextInput,
  Platform,
  StyleSheet,
  type TextProps,
  type TextInputProps,
} from "react-native";
import { cssInterop } from "nativewind";

const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });
const serifStyle = { fontFamily: SERIF };

export const Text = React.forwardRef<RNText, TextProps>(({ style, ...props }, ref) => (
  <RNText ref={ref} style={[serifStyle, style]} {...props} />
));
Text.displayName = "Text";

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(
  ({ style, ...props }, ref) => {
    // iOS clips glyph descenders (j, g, y, p) inside a TextInput whenever a
    // `lineHeight` is set on it - and the serif font has deep descenders. Drop
    // any lineHeight so the font's natural metrics are used. (Android keeps its
    // default includeFontPadding, which already reserves descender space.)
    const flat: Record<string, any> = { ...(StyleSheet.flatten(style) || {}) };
    if (flat.lineHeight != null) delete flat.lineHeight;
    return <RNTextInput ref={ref} style={[serifStyle, flat]} {...props} />;
  }
);
TextInput.displayName = "TextInput";

// Let NativeWind's className map to `style` on these wrappers.
cssInterop(Text, { className: "style" });
cssInterop(TextInput, { className: "style" });
