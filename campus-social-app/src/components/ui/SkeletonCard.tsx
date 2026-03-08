import React from "react";
import { View } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";

export function SkeletonCard({ height = 96 }: { height?: number }) {
  const { palette } = useThemeContext();

  return (
    <View
      style={{
        height,
        borderRadius: 14,
        backgroundColor: palette.colors.inputMuted,
        opacity: 0.55,
        marginBottom: 10,
      }}
    />
  );
}
