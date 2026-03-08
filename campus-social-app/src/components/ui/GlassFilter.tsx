import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";

type GlassFilterProps = {
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  children?: React.ReactNode;
  intensity?: number;
  animated?: boolean;
};

export function GlassFilter({ style, borderRadius = 16, children }: GlassFilterProps) {
  const { palette } = useThemeContext();
  return (
    <View
      style={[
        {
          borderRadius,
          overflow: "hidden",
          backgroundColor: palette.colors.surface,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
