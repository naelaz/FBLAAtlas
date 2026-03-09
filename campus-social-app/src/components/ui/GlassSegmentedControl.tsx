import React from "react";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";

import { useAccessibility } from "../../context/AccessibilityContext";
import { useThemeContext } from "../../context/ThemeContext";
import { hapticTap } from "../../services/haptics";
import { GlassSurface } from "./GlassSurface";

export type SegmentedOption = {
  label: string;
  value: string;
  icon?: React.ReactNode;
};

type GlassSegmentedControlProps = {
  value: string;
  options: SegmentedOption[];
  onValueChange: (nextValue: string) => void;
  style?: StyleProp<ViewStyle>;
  size?: "sm" | "md" | "lg";
  accentColor?: string;
};

const HEIGHT_BY_SIZE = {
  sm: 36,
  md: 42,
  lg: 48,
} as const;

export function GlassSegmentedControl({
  value,
  options,
  onValueChange,
  style,
  size = "md",
  accentColor,
}: GlassSegmentedControlProps) {
  const { palette } = useThemeContext();
  const { scaleFont, getFontWeight, getAccessibilityHint } = useAccessibility();

  return (
    <GlassSurface
      borderRadius={999}
      style={[
        {
          minHeight: HEIGHT_BY_SIZE[size],
          borderRadius: 999,
          overflow: "hidden",
          padding: 3,
          backgroundColor: palette.colors.surface,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "stretch" }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                if (option.value === value) {
                  return;
                }
                hapticTap();
                onValueChange(option.value);
              }}
              style={{
                flex: 1,
                minHeight: HEIGHT_BY_SIZE[size] - 6,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
                paddingHorizontal: 12,
                backgroundColor: selected ? (accentColor ?? palette.colors.inputSurface) : "transparent",
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label} tab`}
              accessibilityHint={getAccessibilityHint(
                selected ? "Currently selected" : `Switch to ${option.label}`,
              )}
            >
              {option.icon ? <View>{option.icon}</View> : null}
              <Text
                numberOfLines={1}
                style={{
                  fontWeight: getFontWeight(selected ? "700" : "500"),
                  color: selected ? palette.colors.text : palette.colors.textSecondary,
                  fontSize: scaleFont(size === "sm" ? 12 : 13),
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </GlassSurface>
  );
}
