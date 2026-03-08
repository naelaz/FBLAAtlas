import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { CalendarDays, CircleUserRound, House, MessageCircle } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Keyboard, LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";

import { ThemePalette } from "../../constants/themes";
import { useMessaging } from "../../context/MessagingContext";
import { useNavBarVisibility } from "../../context/NavBarVisibilityContext";
import { useThemeContext } from "../../context/ThemeContext";
import { MainTabParamList } from "../../navigation/types";
import { FinnRobotIcon } from "../branding/FinnRobotIcon";
import { SchoolCrestIcon } from "../branding/SchoolCrestIcon";

const SPRING_CONFIG = { damping: 18, stiffness: 250 };

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
    default:
      return routeName;
  }
}

function iconForRoute(routeName: keyof MainTabParamList, color: string, focused: boolean) {
  const opacity = focused ? 1 : 0.72;

  switch (routeName) {
    case "Home":
      return (
        <View style={{ opacity }}>
          <SchoolCrestIcon size={20} initials="FA" />
        </View>
      );
    case "Events":
      return <CalendarDays size={20} color={color} strokeWidth={2.4} style={{ opacity }} />;
    case "Finn":
      return (
        <View style={{ opacity }}>
          <FinnRobotIcon size={20} />
        </View>
      );
    case "Messages":
      return <MessageCircle size={20} color={color} strokeWidth={2.4} style={{ opacity }} />;
    case "Profile":
      return <CircleUserRound size={20} color={color} strokeWidth={2.4} style={{ opacity }} />;
    default:
      return <House size={20} color={color} strokeWidth={2.4} style={{ opacity }} />;
  }
}

function TabItem({
  focused,
  routeName,
  onPress,
  color,
  palette,
  unreadCount = 0,
}: {
  focused: boolean;
  routeName: keyof MainTabParamList;
  onPress: () => void;
  color: string;
  palette: ThemePalette;
  unreadCount?: number;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.04 : 1, SPRING_CONFIG);
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        scale.value = withSpring(1.13, { damping: 10, stiffness: 280 }, () => {
          scale.value = withSpring(focused ? 1.04 : 1, SPRING_CONFIG);
        });
        onPress();
      }}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 52 }}
      accessibilityRole="button"
      accessibilityLabel={labelForRoute(routeName)}
    >
      <Animated.View style={[{ alignItems: "center", justifyContent: "center", width: "100%" }, animatedStyle]}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: focused ? palette.colors.primarySoft : "transparent",
            borderWidth: focused ? 1 : 0,
            borderColor: focused ? palette.colors.primary : "transparent",
          }}
        >
          {iconForRoute(routeName, color, focused)}
        </View>
        <Text
          style={{
            marginTop: 2,
            fontSize: 10,
            fontWeight: focused ? "700" : "600",
            color,
          }}
          numberOfLines={1}
        >
          {labelForRoute(routeName)}
        </Text>

        {unreadCount > 0 ? (
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
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const translateY = useSharedValue(0);
  const activeIndex = useSharedValue(state.index);
  const tabWidth = useSharedValue(0);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    translateY.value = withTiming(hidden || keyboardOpen ? 120 : 0, { duration: 230 });
  }, [hidden, keyboardOpen, translateY]);

  useEffect(() => {
    activeIndex.value = withSpring(state.index, SPRING_CONFIG);
  }, [activeIndex, state.index]);

  const animatedContainer = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: interpolate(translateY.value, [0, 120], [1, 0]),
  }));

  const lampStyle = useAnimatedStyle(() => {
    const width = Math.max(44, tabWidth.value - 22);
    const x = activeIndex.value * tabWidth.value + (tabWidth.value - width) / 2;

    return {
      width,
      transform: [{ translateX: x }],
      opacity: tabWidth.value > 0 ? 1 : 0,
    };
  });

  const onRowLayout = (event: LayoutChangeEvent) => {
    tabWidth.value = event.nativeEvent.layout.width / state.routes.length;
  };

  return (
    <Animated.View
      pointerEvents={hidden || keyboardOpen ? "none" : "auto"}
      style={[
        styles.wrapper,
        {
          bottom: Math.max(insets.bottom, 10) + 8,
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
          <BlurView
            style={StyleSheet.absoluteFill}
            tint={palette.isDark ? "dark" : "light"}
            intensity={palette.blur.md}
          />
        ) : null}

        <View style={styles.row} onLayout={onRowLayout}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.lamp,
              {
                backgroundColor: palette.colors.primarySoft,
                borderColor: palette.colors.primary,
              },
              lampStyle,
            ]}
          >
            <View
              style={[
                styles.lampBar,
                {
                  backgroundColor: palette.colors.primary,
                  shadowColor: palette.colors.primary,
                },
              ]}
            />
            <View style={[styles.lampGlow, { backgroundColor: palette.colors.accentGlow }]} />
          </Animated.View>

          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const color = focused ? palette.colors.primary : palette.colors.muted;
            const isMessages = route.name === "Messages";

            return (
              <TabItem
                key={route.key}
                focused={focused}
                routeName={route.name as keyof MainTabParamList}
                color={color}
                palette={palette}
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
    width: "93%",
    borderRadius: 34,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  row: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 66,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  lamp: {
    position: "absolute",
    left: 0,
    top: 4,
    bottom: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  lampBar: {
    position: "absolute",
    top: -2,
    alignSelf: "center",
    width: 24,
    height: 3,
    borderRadius: 999,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  lampGlow: {
    position: "absolute",
    top: -12,
    alignSelf: "center",
    width: 38,
    height: 14,
    borderRadius: 999,
    opacity: 0.55,
  },
});
