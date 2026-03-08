import React from "react";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";
import { hapticTap } from "../../services/haptics";
import { GlassSurface } from "./GlassSurface";

type GlassToggleSize = "sm" | "md" | "lg";

type GlassToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  size?: GlassToggleSize;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
};

const SIZE_MAP: Record<GlassToggleSize, { width: number; height: number; thumb: number }> = {
  sm: { width: 42, height: 26, thumb: 20 },
  md: { width: 50, height: 30, thumb: 24 },
  lg: { width: 58, height: 34, thumb: 28 },
};

export function GlassToggle({
  value,
  onValueChange,
  disabled = false,
  size = "md",
  accentColor,
  style,
}: GlassToggleProps) {
  const { palette } = useThemeContext();
  const dimensions = SIZE_MAP[size];
  const thumbLeft = value ? dimensions.width - dimensions.thumb - 3 : 3;

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        if (disabled) {
          return;
        }
        hapticTap();
        onValueChange(!value);
      }}
      style={style}
      accessibilityRole="switch"
      accessibilityState={{ disabled, checked: value }}
    >
      <GlassSurface
        borderRadius={999}
        disabled={disabled}
        backgroundColor={value ? accentColor ?? palette.colors.inputSurface : palette.colors.inputMuted}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: 999,
          justifyContent: "center",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: thumbLeft,
            width: dimensions.thumb,
            height: dimensions.thumb,
            borderRadius: dimensions.thumb / 2,
            backgroundColor: value ? palette.colors.text : palette.colors.textSecondary,
          }}
        />
      </GlassSurface>
    </Pressable>
  );
}
