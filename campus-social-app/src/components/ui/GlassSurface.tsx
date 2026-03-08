import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

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
  borderRadius = 12,
  tone = "neutral",
  pressed = false,
  disabled = false,
  accentColor,
}: GlassSurfaceProps) {
  const { palette } = useThemeContext();
  const baseColor =
    backgroundColor ??
    (tone === "accent"
      ? toneColor(tone, accentColor ?? palette.colors.accentMuted)
      : tone === "danger"
        ? palette.colors.dangerGlass
        : tone === "success"
          ? palette.colors.successGlass
          : palette.colors.surface);

  return (
    <View
      style={[
        {
          borderRadius,
          borderWidth: 1,
          borderColor: borderColor ?? palette.colors.border,
          backgroundColor: disabled ? palette.colors.glassDisabled : pressed ? palette.colors.glassPressed : baseColor,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
