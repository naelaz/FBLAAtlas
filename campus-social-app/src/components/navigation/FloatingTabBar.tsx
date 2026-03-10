import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";

import { useAccessibility } from "../../context/AccessibilityContext";
import { useMessaging } from "../../context/MessagingContext";
import { useNavBarVisibility } from "../../context/NavBarVisibilityContext";
import { useThemeContext } from "../../context/ThemeContext";
import { useDashboard } from "../../context/DashboardContext";
import { MainTabParamList } from "../../navigation/types";
import { FinnRobotIcon } from "../branding/FinnRobotIcon";
import { GlassSurface } from "../ui/GlassSurface";

function labelForRoute(routeName: keyof MainTabParamList): string {
  switch (routeName) {
    case "Home":
      return "Home";
    case "PracticeTab":
      return "Practice";
    case "Finn":
      return "Finn";
    case "Messages":
      return "Inbox";
    case "SettingsTab":
      return "Settings";
    default:
      return routeName;
  }
}

function iconForRoute(routeName: keyof MainTabParamList, color: string, focused: boolean) {
  const iconSize = focused ? 24 : 24;
  switch (routeName) {
    case "Home":
      return <Feather name="home" size={iconSize} color={color} />;
    case "PracticeTab":
      return <Feather name="book-open" size={iconSize} color={color} />;
    case "Finn":
      return <FinnRobotIcon size={iconSize + 2} />;
    case "Messages":
      return <Feather name="message-circle" size={iconSize} color={color} />;
    case "SettingsTab":
      return <Feather name="settings" size={iconSize} color={color} />;
    default:
      return <Feather name="home" size={iconSize} color={color} />;
  }
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { scaleFont, getFontWeight, oneHandedMode, leftHandedMode } = useAccessibility();
  const { unreadCount } = useMessaging();
  const { layout } = useDashboard();
  const { navTranslateY } = useNavBarVisibility();
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: navTranslateY.value }],
  }));

  if (keyboardOpen) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        animatedStyle,
        {
          bottom: Math.max(insets.bottom, 10) + (oneHandedMode ? 4 : 8),
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
        <View
          style={[
            styles.row,
            {
              flexDirection: leftHandedMode ? "row-reverse" : "row",
            },
          ]}
        >
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const color = focused ? palette.colors.accent : palette.colors.textMuted;
            const isMessages = route.name === "Messages";
            const isPractice = route.name === "PracticeTab";
            const badgeCount = isMessages ? unreadCount : isPractice ? pendingPracticeCount : 0;

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
                  {iconForRoute(route.name as keyof MainTabParamList, color, focused)}
                  <Text
                    style={{
                      marginTop: 2,
                      fontSize: scaleFont(10),
                      fontWeight: getFontWeight(focused ? "700" : "600"),
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
    </Animated.View>
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
