import React from "react";
import { Pressable, ViewStyle } from "react-native";

import { useAccessibility } from "../../context/AccessibilityContext";
import { hapticTap } from "../../services/haptics";
import { GlassTone } from "../../theme/glass";
import { GlassSurface } from "./GlassSurface";

type GlassIconButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  children: React.ReactNode;
  tone?: GlassTone;
  size?: number;
  style?: ViewStyle;
};

export function GlassIconButton({
  onPress,
  accessibilityLabel,
  accessibilityHint,
  children,
  tone = "neutral",
  size = 38,
  style,
}: GlassIconButtonProps) {
  const { getAccessibilityHint } = useAccessibility();
  const radius = size / 2;
  const resolvedHint = accessibilityHint ?? "Activates this icon button";

  return (
    <Pressable
      onPress={() => {
        hapticTap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={getAccessibilityHint(resolvedHint)}
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
