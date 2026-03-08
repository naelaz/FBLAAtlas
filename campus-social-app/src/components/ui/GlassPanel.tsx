import React from "react";
import { DimensionValue, StyleProp, ViewStyle } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";
import { GlassSurface } from "./GlassSurface";

type GlassPanelProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxHeight?: DimensionValue;
  borderRadius?: number;
  size?: "sm" | "md" | "lg";
  accentColor?: string;
};

export function GlassPanel({
  children,
  style,
  maxHeight = "86%",
  borderRadius = 20,
  size = "md",
  accentColor,
}: GlassPanelProps) {
  const { palette } = useThemeContext();
  const radius = borderRadius ?? (size === "sm" ? 16 : size === "lg" ? 24 : 20);

  return (
    <GlassSurface
      strong
      elevation={4}
      borderRadius={radius}
      intensity={palette.blur.lg}
      accentColor={accentColor}
      style={[
        {
          maxHeight,
          borderTopLeftRadius: radius,
          borderTopRightRadius: radius,
          borderWidth: 1,
          borderColor: palette.colors.glassBorder,
          backgroundColor: palette.colors.glassStrong,
          padding: size === "sm" ? 10 : size === "lg" ? 18 : 14,
        },
        style,
      ]}
    >
      {children}
    </GlassSurface>
  );
}
