import React from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";

import { hapticTap } from "../../services/haptics";
import { GlassSurface } from "./GlassSurface";

type GlassCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevation?: 1 | 2 | 3 | 4;
  strong?: boolean;
  borderRadius?: number;
  tone?: "neutral" | "accent" | "danger" | "success";
  pressed?: boolean;
  padding?: number;
  size?: "sm" | "md" | "lg";
  accentColor?: string;
  onPress?: () => void;
};

export function GlassCard({
  children,
  style,
  borderRadius = 16,
  tone = "neutral",
  pressed = false,
  padding = 12,
  size = "md",
  accentColor,
  onPress,
}: GlassCardProps) {
  const radius = borderRadius ?? (size === "sm" ? 14 : size === "lg" ? 22 : 16);
  const resolvedPadding = size === "sm" ? 10 : size === "lg" ? 16 : padding;

  const content = (
    <GlassSurface
      tone={tone}
      pressed={pressed}
      borderRadius={radius}
      accentColor={accentColor}
      style={[
        {
          borderRadius: radius,
          padding: resolvedPadding,
        },
        style,
      ]}
    >
      {children}
    </GlassSurface>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={() => {
        hapticTap();
        onPress();
      }}
    >
      {content}
    </Pressable>
  );
}
