import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";

import { useAccessibility } from "../../context/AccessibilityContext";
import { useThemeContext } from "../../context/ThemeContext";

type BackButtonProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function BackButton({ onPress, style }: BackButtonProps) {
  const { palette } = useThemeContext();
  const { getAccessibilityHint } = useAccessibility();

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
      accessibilityHint={getAccessibilityHint("Returns to the previous screen")}
    >
      <ChevronLeft size={20} color={palette.colors.text} />
    </Pressable>
  );
}
