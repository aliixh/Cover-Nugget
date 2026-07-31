// Babel config for Expo + NativeWind v4.
// - babel-preset-expo handles Expo Router + React Native.
// - jsxImportSource "nativewind" enables the `className` prop on RN components.
// - "nativewind/babel" compiles Tailwind classes.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated 4 (SDK 54) uses the react-native-worklets babel plugin; it must
    // be listed LAST. Powers the drawer navigator + NativeWind animations.
    plugins: ["react-native-worklets/plugin"],
  };
};
