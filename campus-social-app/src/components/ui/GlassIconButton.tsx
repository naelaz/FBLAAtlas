import React from "react";
import { Pressable, ViewStyle } from "react-native";

import { GlassTone } from "../../theme/glass";
import { GlassSurface } from "./GlassSurface";

type GlassIconButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
  tone?: GlassTone;
  size?: number;
  style?: ViewStyle;
};

export function GlassIconButton({
  onPress,
  accessibilityLabel,
  children,
  tone = "neutral",
  size = 38,
  style,
}: GlassIconButtonProps) {
  const radius = size / 2;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        {
          minWidth: size,
          minHeight: size,
          borderRadius: radius,
        },
        style,
      ]}
    >
      {({ pressed }) => (
        <GlassSurface
          borderRadius={radius}
          tone={tone}
          elevation={2}
          pressed={pressed}
          style={{
            minWidth: size,
            minHeight: size,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </GlassSurface>
      )}
    </Pressable>
  );
}
