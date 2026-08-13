// Main app navigation: a drawer opened by the top-left ☰ hamburger (spec §4).
// Menu entries: Home, Profile, Cover Letter Archive, Your Assistant, Settings.
// The drawer panel has a little dino-nugget flourish (kept subtle).

import { Drawer } from "expo-router/drawer";
import {
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { Platform, View } from "react-native";
import { Text } from "../../src/ui/serif";
import { Logo } from "../../src/components/Logo";
import { useApp } from "../../src/context/AppContext";

// React Navigation renders the header title + drawer labels with its own Text
// (not our serif wrapper), so apply the serif family to those explicitly.
const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

/** Drawer panel with a mascot header + a faint emoji footer. */
function DrawerContent(props: DrawerContentComponentProps) {
  return (
    <DrawerContentScrollView {...props}>
      <View className="mb-3 items-center px-4 pb-4 pt-2">
        <Logo width={92} />
        <Text className="mt-1 text-lg font-bold text-primary dark:text-dark-primary">
          Cover Nugget
        </Text>
      </View>

      <DrawerItemList {...props} />

      <View className="mt-8 items-center opacity-30">
        <Logo width={54} />
      </View>
    </DrawerContentScrollView>
  );
}

export default function AppDrawerLayout() {
  const { colors } = useApp();

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        // Header - default ☰ hamburger (three lines)
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: SERIF, fontWeight: "700" },
        // Drawer panel
        drawerActiveTintColor: colors.accent,
        drawerInactiveTintColor: colors.text,
        drawerStyle: { backgroundColor: colors.surface },
        drawerLabelStyle: { fontFamily: SERIF },
      }}
    >
      <Drawer.Screen name="home" options={{ title: "Cover Nugget", drawerLabel: "Home" }} />
      <Drawer.Screen name="profile" options={{ title: "Profile", drawerLabel: "Profile" }} />
      <Drawer.Screen
        name="archive"
        options={{ title: "Cover Letter Archive", drawerLabel: "Cover Letter Archive" }}
      />
      <Drawer.Screen name="model" options={{ title: "Your Assistant", drawerLabel: "Your Assistant" }} />
      <Drawer.Screen name="settings" options={{ title: "Settings", drawerLabel: "Settings" }} />
    </Drawer>
  );
}
