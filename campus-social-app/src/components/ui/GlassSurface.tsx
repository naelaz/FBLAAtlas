import React, { useEffect } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { useAccessibility } from "../../context/AccessibilityContext";
import { useThemeContext } from "../../context/ThemeContext";

type GlassSurfaceProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
  intensity?: number;
  borderRadius?: number;
  tone?: "neutral" | "accent" | "danger" | "success";
  elevation?: 1 | 2 | 3 | 4;
  strong?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  showHighlights?: boolean;
  accentColor?: string;
};

function toneColor(_tone: GlassSurfaceProps["tone"], palettePrimary: string): string {
  return palettePrimary;
}

export function GlassSurface({
  children,
  style,
  backgroundColor,
  borderColor,
  borderRadius = 16,
  tone = "neutral",
  pressed = false,
  disabled = false,
  accentColor,
}: GlassSurfaceProps) {
  const { palette } = useThemeContext();
  const { highContrastMode, reduceAnimations } = useAccessibility();
  const baseColor =
    backgroundColor ??
    (tone === "accent"
      ? toneColor(tone, accentColor ?? palette.colors.accentMuted)
      : tone === "danger"
        ? palette.colors.dangerGlass
        : tone === "success"
          ? palette.colors.successGlass
          : palette.colors.surface);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceAnimations) {
      scale.value = pressed ? 0.97 : 1;
      opacity.value = pressed ? 0.92 : 1;
      return;
    }
    scale.value = withSpring(pressed ? 0.97 : 1, {
      stiffness: 400,
      damping: 28,
      mass: 0.6,
    });
    opacity.value = withSpring(pressed ? 0.92 : 1, {
      stiffness: 400,
      damping: 28,
      mass: 0.6,
    });
  }, [pressed, reduceAnimations, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          borderRadius,
          borderWidth: highContrastMode ? 2 : 1,
          borderColor: borderColor ?? palette.colors.border,
          backgroundColor: disabled ? palette.colors.glassDisabled : pressed ? palette.colors.glassPressed : baseColor,
          shadowOpacity: palette.isDark ? 0 : 0.04,
          shadowRadius: palette.isDark ? 0 : 4,
          shadowOffset: { width: 0, height: palette.isDark ? 0 : 1 },
          elevation: palette.isDark ? 0 : 1,
        },
        style,
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}
