import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CalendarDays, CircleUserRound, Cog, House, MessageCircle } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";

import { useMessaging } from "../../context/MessagingContext";
import { useNavBarVisibility } from "../../context/NavBarVisibilityContext";
import { useThemeContext } from "../../context/ThemeContext";
import { useDashboard } from "../../context/DashboardContext";
import { MainTabParamList } from "../../navigation/types";
import { FinnRobotIcon } from "../branding/FinnRobotIcon";
import { SchoolCrestIcon } from "../branding/SchoolCrestIcon";
import { GlassSurface } from "../ui/GlassSurface";

function labelForRoute(routeName: keyof MainTabParamList): string {
  switch (routeName) {
    case "Home":
      return "Home";
    case "Events":
      return "Events";
    case "Finn":
      return "Finn";
    case "Messages":
      return "Inbox";
    case "Profile":
      return "Profile";
    case "SettingsTab":
      return "Settings";
    default:
      return routeName;
  }
}

function iconForRoute(routeName: keyof MainTabParamList, color: string) {
  switch (routeName) {
    case "Home":
      return <SchoolCrestIcon size={24} initials="FA" />;
    case "Events":
      return <CalendarDays size={24} color={color} strokeWidth={2.2} />;
    case "Finn":
      return <FinnRobotIcon size={24} />;
    case "Messages":
      return <MessageCircle size={24} color={color} strokeWidth={2.2} />;
    case "Profile":
      return <CircleUserRound size={24} color={color} strokeWidth={2.2} />;
    case "SettingsTab":
      return <Cog size={24} color={color} strokeWidth={2.2} />;
    default:
      return <House size={24} color={color} strokeWidth={2.2} />;
  }
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useMessaging();
  const { layout } = useDashboard();
  const { hidden } = useNavBarVisibility();
  const { palette } = useThemeContext();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const pendingPracticeCount = layout.selectedCompetitiveEvents.length;

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (hidden || keyboardOpen) {
    return null;
  }

  return (
    <View
      style={[
        styles.wrapper,
        {
          bottom: Math.max(insets.bottom, 10) + 8,
        },
      ]}
    >
      <GlassSurface
        borderRadius={20}
        style={{
          width: "94%",
          borderRadius: 20,
          backgroundColor: palette.colors.surface,
          paddingHorizontal: 8,
          paddingVertical: 8,
        }}
      >
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const color = focused ? palette.colors.text : palette.colors.muted;
            const isMessages = route.name === "Messages";
            const isEvents = route.name === "Events";
            const badgeCount = isMessages ? unreadCount : isEvents ? pendingPracticeCount : 0;

            return (
              <Pressable
                key={route.key}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 52 }}
                accessibilityRole="button"
                accessibilityLabel={labelForRoute(route.name as keyof MainTabParamList)}
              >
                <View style={{ alignItems: "center", justifyContent: "center", width: "100%" }}>
                  {iconForRoute(route.name as keyof MainTabParamList, color)}
                  <Text
                    style={{
                      marginTop: 2,
                      fontSize: 10,
                      fontWeight: focused ? "700" : "600",
                      color,
                    }}
                    numberOfLines={1}
                  >
                    {labelForRoute(route.name as keyof MainTabParamList)}
                  </Text>

                  {badgeCount > 0 ? (
                    <View
                      style={{
                        position: "absolute",
                        top: -2,
                        right: "24%",
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        paddingHorizontal: 3,
                        backgroundColor: palette.colors.danger,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: palette.colors.onDanger, fontSize: 10, fontWeight: "700" }}>
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  row: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 66,
  },
});
