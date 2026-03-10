import { Compass } from "lucide-react-native";
import React from "react";
import { View } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";

type SchoolCrestIconProps = {
  size?: number;
  initials?: string;
};

export function SchoolCrestIcon({ size = 40 }: SchoolCrestIconProps) {
  const { palette } = useThemeContext();
  const containerSize = Math.max(20, size);
  const iconSize = Math.max(14, containerSize - 10);

  return (
    <View
      style={{
        width: containerSize,
        height: containerSize,
        borderRadius: containerSize / 2,
        borderWidth: 1,
        borderColor: palette.colors.border,
        backgroundColor: palette.colors.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Compass size={iconSize} color={palette.colors.text} strokeWidth={2.1} />
    </View>
  );
}

