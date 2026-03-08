import React from "react";
import { View } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";

type MessageLoadingProps = {
  size?: "sm" | "md" | "lg";
};

const SIZE_MAP = {
  sm: { dot: 5, gap: 4, minHeight: 14 },
  md: { dot: 7, gap: 5, minHeight: 20 },
  lg: { dot: 9, gap: 6, minHeight: 24 },
} as const;

export function MessageLoading({ size = "md" }: MessageLoadingProps) {
  const { palette } = useThemeContext();
  const token = SIZE_MAP[size];

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: token.gap, minHeight: token.minHeight }}>
      <View
        style={{
          width: token.dot,
          height: token.dot,
          borderRadius: token.dot / 2,
          backgroundColor: palette.colors.subtleDot,
          opacity: 0.5,
        }}
      />
      <View
        style={{
          width: token.dot,
          height: token.dot,
          borderRadius: token.dot / 2,
          backgroundColor: palette.colors.subtleDot,
          opacity: 0.75,
        }}
      />
      <View
        style={{
          width: token.dot,
          height: token.dot,
          borderRadius: token.dot / 2,
          backgroundColor: palette.colors.subtleDot,
          opacity: 1,
        }}
      />
    </View>
  );
}
