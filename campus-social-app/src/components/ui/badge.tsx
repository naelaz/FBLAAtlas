import React from "react";
import { StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";
import { TierName } from "../../types/social";

type VariantPalette = {
  lightBg: string;
  darkBg: string;
  lightText: string;
  darkText: string;
};

const variants = {
  gray: { lightBg: "#8f8f8f", darkBg: "#8f8f8f", lightText: "#FFFFFF", darkText: "#FFFFFF" },
  "gray-subtle": { lightBg: "#ebebeb", darkBg: "#1f1f1f", lightText: "#171717", darkText: "#ededed" },
  blue: { lightBg: "#006bff", darkBg: "#006bff", lightText: "#FFFFFF", darkText: "#FFFFFF" },
  "blue-subtle": { lightBg: "#e9f4ff", darkBg: "#022248", lightText: "#005ff2", darkText: "#47a8ff" },
  purple: { lightBg: "#a000f8", darkBg: "#a000f8", lightText: "#FFFFFF", darkText: "#FFFFFF" },
  "purple-subtle": { lightBg: "#f9f0ff", darkBg: "#341142", lightText: "#7d00cc", darkText: "#c472fb" },
  amber: { lightBg: "#ffae00", darkBg: "#ffae00", lightText: "#000000", darkText: "#000000" },
  "amber-subtle": { lightBg: "#fff4cf", darkBg: "#361900", lightText: "#aa4d00", darkText: "#ff9300" },
  red: { lightBg: "#fc0035", darkBg: "#fc0035", lightText: "#FFFFFF", darkText: "#FFFFFF" },
  "red-subtle": { lightBg: "#ffe8ea", darkBg: "#440d13", lightText: "#d8001b", darkText: "#ff565f" },
  pink: { lightBg: "#f22782", darkBg: "#f22782", lightText: "#FFFFFF", darkText: "#FFFFFF" },
  "pink-subtle": { lightBg: "#ffdfeb", darkBg: "#571032", lightText: "#c41562", darkText: "#ff4d8d" },
  green: { lightBg: "#28a948", darkBg: "#28a948", lightText: "#FFFFFF", darkText: "#FFFFFF" },
  "green-subtle": { lightBg: "#e5fce7", darkBg: "#00320b", lightText: "#107d32", darkText: "#00ca50" },
  teal: { lightBg: "#00ac96", darkBg: "#00ac96", lightText: "#FFFFFF", darkText: "#FFFFFF" },
  "teal-subtle": { lightBg: "#ccf9f1", darkBg: "#003d34", lightText: "#007f70", darkText: "#00cfb7" },
  inverted: { lightBg: "#171717", darkBg: "#ededed", lightText: "#f2f2f2", darkText: "#1a1a1a" },
  trial: { lightBg: "#0070F3", darkBg: "#0070F3", lightText: "#FFFFFF", darkText: "#FFFFFF" },
  turbo: { lightBg: "#ff1e56", darkBg: "#ff1e56", lightText: "#FFFFFF", darkText: "#FFFFFF" },
} satisfies Record<string, VariantPalette>;

const sizes = {
  sm: {
    fontSize: 11,
    height: 20,
    px: 6,
    gap: 3,
    letterSpacing: 0.2,
    icon: 11,
  },
  md: {
    fontSize: 12,
    height: 24,
    px: 10,
    gap: 4,
    letterSpacing: 0,
    icon: 14,
  },
  lg: {
    fontSize: 14,
    height: 32,
    px: 12,
    gap: 6,
    letterSpacing: 0,
    icon: 16,
  },
} as const;

export type BadgeVariant = keyof typeof variants;
export type BadgeSize = keyof typeof sizes;

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  capitalize?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

function withIconColor(icon: React.ReactNode, color: string, iconSize: number) {
  if (!React.isValidElement(icon)) {
    return icon;
  }

  const element = icon as React.ReactElement<Record<string, unknown>>;
  return React.cloneElement(element, {
    color,
    fill: color,
    size: iconSize,
    width: iconSize,
    height: iconSize,
  });
}

export function getTierBadgeVariant(tier: TierName): BadgeVariant {
  switch (tier) {
    case "Bronze":
      return "amber-subtle";
    case "Silver":
      return "gray-subtle";
    case "Gold":
      return "amber";
    case "Platinum":
      return "teal-subtle";
    case "Diamond":
      return "blue-subtle";
    case "Legend":
      return "purple";
    default:
      return "gray-subtle";
  }
}

export const Badge = ({
  children,
  variant = "gray",
  size = "md",
  capitalize = true,
  icon,
  style,
  textStyle,
}: BadgeProps) => {
  const { palette } = useThemeContext();
  const sizeStyle = sizes[size];
  const variantStyle = variants[variant];
  const backgroundColor = palette.isDark ? variantStyle.darkBg : variantStyle.lightBg;
  const color = palette.isDark ? variantStyle.darkText : variantStyle.lightText;

  return (
    <View
      style={[
        {
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 9999,
          minHeight: sizeStyle.height,
          height: sizeStyle.height,
          paddingHorizontal: sizeStyle.px,
          gap: sizeStyle.gap,
          backgroundColor,
        },
        style,
      ]}
    >
      {icon ? <View>{withIconColor(icon, color, sizeStyle.icon)}</View> : null}
      <Text
        style={[
          {
            fontWeight: "600",
            fontVariant: ["tabular-nums"],
            includeFontPadding: false,
            fontSize: sizeStyle.fontSize,
            letterSpacing: sizeStyle.letterSpacing,
            color,
            textTransform: capitalize ? "capitalize" : "none",
          },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );
};
