import React from "react";
import { StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";

import { ThemePalette } from "../../constants/themes";
import { useAccessibility } from "../../context/AccessibilityContext";
import { useThemeContext } from "../../context/ThemeContext";
import { TierName } from "../../types/social";

const BADGE_VARIANTS = [
  "gray",
  "gray-subtle",
  "blue",
  "blue-subtle",
  "purple",
  "purple-subtle",
  "amber",
  "amber-subtle",
  "red",
  "red-subtle",
  "pink",
  "pink-subtle",
  "green",
  "green-subtle",
  "teal",
  "teal-subtle",
  "inverted",
  "trial",
  "turbo",
] as const;

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

export type BadgeVariant = (typeof BADGE_VARIANTS)[number];
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

type BadgeColorPair = {
  backgroundColor: string;
  textColor: string;
};

function getBadgeColors(variant: BadgeVariant, palette: ThemePalette): BadgeColorPair {
  switch (variant) {
    case "gray":
      return { backgroundColor: palette.colors.chipSurface, textColor: palette.colors.text };
    case "gray-subtle":
      return { backgroundColor: palette.colors.surfaceSoft, textColor: palette.colors.textSecondary };
    case "blue":
      return { backgroundColor: palette.colors.primary, textColor: palette.colors.onPrimary };
    case "blue-subtle":
      return { backgroundColor: palette.colors.primarySoft, textColor: palette.colors.primary };
    case "purple":
      return { backgroundColor: palette.colors.secondary, textColor: palette.colors.onPrimary };
    case "purple-subtle":
      return { backgroundColor: palette.colors.secondarySoft, textColor: palette.colors.secondary };
    case "amber":
      return { backgroundColor: palette.colors.warning, textColor: palette.colors.background };
    case "amber-subtle":
      return { backgroundColor: palette.colors.secondarySoft, textColor: palette.colors.warning };
    case "red":
      return { backgroundColor: palette.colors.danger, textColor: palette.colors.onDanger };
    case "red-subtle":
      return { backgroundColor: palette.colors.surfaceSoft, textColor: palette.colors.danger };
    case "pink":
      return { backgroundColor: palette.colors.primary, textColor: palette.colors.onPrimary };
    case "pink-subtle":
      return { backgroundColor: palette.colors.primarySoft, textColor: palette.colors.primary };
    case "green":
      return { backgroundColor: palette.colors.success, textColor: palette.colors.onDanger };
    case "green-subtle":
      return { backgroundColor: palette.colors.surfaceSoft, textColor: palette.colors.success };
    case "teal":
      return { backgroundColor: palette.colors.secondary, textColor: palette.colors.onPrimary };
    case "teal-subtle":
      return { backgroundColor: palette.colors.secondarySoft, textColor: palette.colors.secondary };
    case "inverted":
      return { backgroundColor: palette.colors.text, textColor: palette.colors.background };
    case "trial":
      return { backgroundColor: palette.colors.primary, textColor: palette.colors.onPrimary };
    case "turbo":
      return { backgroundColor: palette.colors.secondary, textColor: palette.colors.onPrimary };
    default:
      return { backgroundColor: palette.colors.chipSurface, textColor: palette.colors.text };
  }
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
  const { scaleFont, getFontWeight } = useAccessibility();
  const sizeStyle = sizes[size];
  const { backgroundColor, textColor } = getBadgeColors(variant, palette);

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
      {icon ? <View>{withIconColor(icon, textColor, sizeStyle.icon)}</View> : null}
      <Text
        style={[
          {
            fontWeight: getFontWeight("600"),
            fontVariant: ["tabular-nums"],
            includeFontPadding: false,
            fontSize: scaleFont(sizeStyle.fontSize),
            letterSpacing: sizeStyle.letterSpacing,
            color: textColor,
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
