import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";

import { FinnRobotIcon } from "../branding/FinnRobotIcon";
import { useMessaging } from "../../context/MessagingContext";
import { useNavBarVisibility } from "../../context/NavBarVisibilityContext";
import { useThemeContext } from "../../context/ThemeContext";
import { MainTabParamList } from "../../navigation/types";

function iconNameForRoute(
  routeName: keyof MainTabParamList,
): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (routeName) {
    case "Home":
      return "home-outline";
    case "Events":
      return "calendar-month-outline";
    case "Messages":
      return "message-text-outline";
    case "Profile":
      return "account-outline";
    default:
      return "circle-outline";
  }
}

function TabItem({
  focused,
  routeName,
  onPress,
  color,
  unreadCount = 0,
}: {
  focused: boolean;
  routeName: keyof MainTabParamList;
  onPress: () => void;
  color: string;
  unreadCount?: number;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.08 : 1, { damping: 12, stiffness: 210 });
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const icon =
    routeName === "Finn" ? (
      <FinnRobotIcon size={22} />
    ) : (
      <MaterialCommunityIcons name={iconNameForRoute(routeName)} size={22} color={color} />
    );

  return (
    <Pressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        scale.value = withSpring(1.2, { damping: 10, stiffness: 250 }, () => {
          scale.value = withSpring(focused ? 1.08 : 1, { damping: 12, stiffness: 220 });
        });
        onPress();
      }}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 48 }}
    >
      <Animated.View style={[{ alignItems: "center", justifyContent: "center" }, animatedStyle]}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: focused ? "rgba(37,99,235,0.2)" : "transparent",
            borderWidth: focused ? 1 : 0,
            borderColor: focused ? "rgba(37,99,235,0.45)" : "transparent",
          }}
        >
          {icon}
        </View>
        {unreadCount > 0 ? (
          <View
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              paddingHorizontal: 3,
              backgroundColor: "#EF4444",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useMessaging();
  const { hidden } = useNavBarVisibility();
  const { palette } = useThemeContext();
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(hidden ? 120 : 0, { duration: 230 });
  }, [hidden, translateY]);

  const animatedContainer = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: interpolate(translateY.value, [0, 120], [1, 0]),
  }));

  return (
    <Animated.View
      pointerEvents={hidden ? "none" : "auto"}
      style={[
        styles.wrapper,
        {
          bottom: Math.max(insets.bottom, 10) + 10,
        },
        animatedContainer,
      ]}
    >
      <View
        style={[
          styles.blurShell,
          {
            backgroundColor: palette.colors.tabGlass,
            borderColor: palette.colors.tabBorder,
            shadowColor: palette.colors.primary,
          },
        ]}
      >
        {Platform.OS === "ios" ? (
          <BlurView style={StyleSheet.absoluteFill} tint="light" intensity={40} />
        ) : null}

        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const color = focused ? palette.colors.primary : palette.colors.muted;
            const isMessages = route.name === "Messages";

            return (
              <TabItem
                key={route.key}
                focused={focused}
                routeName={route.name as keyof MainTabParamList}
                color={color}
                unreadCount={isMessages ? unreadCount : 0}
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
              />
            );
          })}
        </View>
      </View>
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
  blurShell: {
    width: "92%",
    borderRadius: 34,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
