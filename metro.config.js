// Metro bundler config wired for NativeWind v4.
// withNativeWind injects the compiled Tailwind stylesheet from ./global.css.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// SDK 54 expo-sqlite ships a web (wasm) backend whose worker imports a .wasm
// asset; register the extension so Metro bundles it (web only — native ignores it).
config.resolver.assetExts.push("wasm");

module.exports = withNativeWind(config, { input: "./global.css" });
