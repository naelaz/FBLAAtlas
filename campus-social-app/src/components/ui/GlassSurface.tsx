import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";

type GlassSurfaceProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
  intensity?: number;
  borderRadius?: number;
};

export function GlassSurface({
  children,
  style,
  backgroundColor,
  borderColor,
  intensity,
  borderRadius = 16,
}: GlassSurfaceProps) {
  const { palette } = useThemeContext();

  return (
    <View
      style={[
        {
          borderRadius,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: borderColor ?? palette.colors.glassBorder,
          backgroundColor: backgroundColor ?? palette.colors.glass,
        },
        style,
      ]}
    >
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={intensity ?? palette.blur.md}
          tint={palette.isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}
