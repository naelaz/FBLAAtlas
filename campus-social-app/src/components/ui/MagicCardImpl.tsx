import React from "react";
import { StyleProp, ViewStyle } from "react-native";

import { GlassCard } from "./GlassCard";

type MagicCardSize = "sm" | "md" | "lg";

export type MagicCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  size?: MagicCardSize;
  borderRadius?: number;
  accentColor?: string;
  elevation?: 1 | 2 | 3 | 4;
};

function sizeDefaults(size: MagicCardSize) {
  if (size === "sm") {
    return { padding: 10, radius: 14 };
  }
  if (size === "lg") {
    return { padding: 16, radius: 22 };
  }
  return { padding: 12, radius: 18 };
}

export function MagicCard({
  children,
  style,
  contentStyle,
  onPress,
  size = "md",
  borderRadius,
  accentColor,
  elevation = 2,
}: MagicCardProps) {
  const defaults = sizeDefaults(size);
  const radius = borderRadius ?? defaults.radius;

  return (
    <GlassCard
      onPress={onPress}
      borderRadius={radius}
      elevation={elevation}
      strong
      accentColor={accentColor}
      style={[
        {
          borderRadius: radius,
          overflow: "hidden",
          padding: defaults.padding,
        },
        style,
        contentStyle,
      ]}
    >
      {children}
    </GlassCard>
  );
}

type VariantProps = Omit<MagicCardProps, "size">;

export function MagicCardQuestion(props: VariantProps) {
  return <MagicCard {...props} size="lg" />;
}

export function MagicCardFlashcard(props: VariantProps) {
  return <MagicCard {...props} size="lg" />;
}

export function MagicCardRubric(props: VariantProps) {
  return <MagicCard {...props} size="md" />;
}

export function MagicCardScore(props: VariantProps) {
  return <MagicCard {...props} size="lg" />;
}
