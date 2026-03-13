import React from "react";
import { DimensionValue, StyleProp, View, ViewStyle } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";
import { GlassSurface } from "./GlassSurface";

type GlassPanelProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxHeight?: DimensionValue;
  borderRadius?: number;
  size?: "sm" | "md" | "lg";
  accentColor?: string;
  showDragHandle?: boolean;
};

export function GlassPanel({
  children,
  style,
  maxHeight = "86%",
  borderRadius = 20,
  size = "md",
  accentColor,
  showDragHandle = true,
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
      {showDragHandle ? (
        <View style={{ alignItems: "center", marginBottom: 10, marginTop: -4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.colors.border }} />
        </View>
      ) : null}
      {children}
    </GlassSurface>
  );
}
