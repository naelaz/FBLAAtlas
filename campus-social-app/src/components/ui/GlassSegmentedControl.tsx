import React, { useEffect } from "react";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
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

type OptionTabProps = {
  option: SegmentedOption;
  selected: boolean;
  size: "sm" | "md" | "lg";
  accentColor?: string;
  numOptions: number;
  onPress: () => void;
};

function OptionTab({ option, selected, size, accentColor, numOptions, onPress }: OptionTabProps) {
  const { palette } = useThemeContext();
  const { scaleFont, getFontWeight, getAccessibilityHint, reduceAnimations } = useAccessibility();

  const pillOpacity = useSharedValue(selected ? 1 : 0);
  const pillScale = useSharedValue(selected ? 1 : 0.88);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    if (reduceAnimations) {
      pillOpacity.value = selected ? 1 : 0;
      pillScale.value = selected ? 1 : 0.88;
      return;
    }
    pillOpacity.value = withSpring(selected ? 1 : 0, { stiffness: 360, damping: 26, mass: 0.7 });
    pillScale.value = withSpring(selected ? 1 : 0.88, { stiffness: 360, damping: 26, mass: 0.7 });
  }, [selected, reduceAnimations, pillOpacity, pillScale]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scale: pillScale.value }],
  }));

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        if (selected) return;
        hapticTap();
        onPress();
      }}
      onPressIn={() => {
        if (!reduceAnimations) {
          pressScale.value = withSpring(0.94, { stiffness: 500, damping: 30 });
        }
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, { stiffness: 400, damping: 25 });
      }}
      style={{ flex: 1 }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${option.label} tab`}
      accessibilityHint={getAccessibilityHint(
        selected ? "Currently selected" : `Switch to ${option.label}`,
      )}
    >
      <Animated.View
        style={[
          {
            flex: 1,
            minHeight: HEIGHT_BY_SIZE[size] - 6,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 6,
            paddingHorizontal: numOptions >= 4 ? 6 : 12,
          },
          wrapperStyle,
        ]}
      >
        {/* Animated pill background */}
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              borderRadius: 999,
              backgroundColor: accentColor ?? palette.colors.inputSurface,
            },
            pillStyle,
          ]}
        />
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
      </Animated.View>
    </Pressable>
  );
}

export function GlassSegmentedControl({
  value,
  options,
  onValueChange,
  style,
  size = "md",
  accentColor,
}: GlassSegmentedControlProps) {
  const { palette } = useThemeContext();

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
        {options.map((option) => (
          <OptionTab
            key={option.value}
            option={option}
            selected={option.value === value}
            size={size}
            accentColor={accentColor}
            numOptions={options.length}
            onPress={() => onValueChange(option.value)}
          />
        ))}
      </View>
    </GlassSurface>
  );
}
