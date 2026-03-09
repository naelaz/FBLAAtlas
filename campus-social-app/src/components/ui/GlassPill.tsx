import React from "react";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";

import { useAccessibility } from "../../context/AccessibilityContext";
import { useThemeContext } from "../../context/ThemeContext";
import { hapticTap } from "../../services/haptics";
import { GlassSurface } from "./GlassSurface";

type GlassPillProps = {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: "sm" | "md" | "lg";
  minHeight?: number;
  accentColor?: string;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function GlassPill({
  label,
  onPress,
  icon,
  selected = false,
  disabled = false,
  style,
  size = "md",
  minHeight = 44,
  accentColor,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: GlassPillProps) {
  const { palette } = useThemeContext();
  const { scaleFont, getFontWeight, getAccessibilityHint } = useAccessibility();
  const resolvedHeight =
    size === "sm" ? Math.min(minHeight, 32) : size === "lg" ? Math.max(minHeight, 48) : minHeight;
  const textSize = size === "sm" ? 11 : size === "lg" ? 13 : 12;
  const resolvedHint = accessibilityHint ?? `Activates ${label.toLowerCase()}`;

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={() => {
        if (!onPress || disabled) {
          return;
        }
        hapticTap();
        onPress();
      }}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={getAccessibilityHint(resolvedHint)}
    >
      {({ pressed }) => (
        <GlassSurface
          pressed={pressed}
          disabled={disabled}
          accentColor={accentColor}
          borderRadius={999}
          style={{
            minHeight: resolvedHeight,
            borderRadius: 999,
            paddingHorizontal: size === "sm" ? 10 : size === "lg" ? 14 : 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: size === "sm" ? 6 : 8,
            backgroundColor: selected ? accentColor ?? palette.colors.inputSurface : palette.colors.surface,
          }}
        >
          {icon ? <View>{icon}</View> : null}
          <Text
            style={{
              color: palette.colors.text,
              fontWeight: getFontWeight("700"),
              fontSize: scaleFont(textSize),
            }}
          >
            {label}
          </Text>
        </GlassSurface>
      )}
    </Pressable>
  );
}
