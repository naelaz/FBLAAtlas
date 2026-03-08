import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";

type BackButtonProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function BackButton({ onPress, style }: BackButtonProps) {
  const { palette } = useThemeContext();

  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <ChevronLeft size={20} color={palette.colors.text} />
    </Pressable>
  );
}

