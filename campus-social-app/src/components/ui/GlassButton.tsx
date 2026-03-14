import React from "react";
import { Pressable, StyleProp, TextStyle, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";

import { useAccessibility } from "../../context/AccessibilityContext";
import { useThemeContext } from "../../context/ThemeContext";
import { hapticTap } from "../../services/haptics";
import { GlassSurface } from "./GlassSurface";

export type GlassButtonVariant = "primary" | "solid" | "ghost" | "destructive" | "icon" | "pill-sm";
export type GlassButtonSize = "sm" | "md" | "lg";

type GlassButtonProps = {
  label?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

const BUTTON_HEIGHTS: Record<GlassButtonSize, number> = {
  sm: 48,
  md: 48,
  lg: 48,
};

export function GlassButton({
  label,
  onPress,
  icon,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "md",
  accentColor,
  style,
  textStyle,
  fullWidth = true,
  accessibilityLabel,
  accessibilityHint,
}: GlassButtonProps) {
  const { palette } = useThemeContext();
  const { scaleFont, getFontWeight, getAccessibilityHint } = useAccessibility();
  const height = variant === "icon" ? 48 : BUTTON_HEIGHTS[size];
  const width = variant === "icon" ? 48 : undefined;
  const resolvedAccent = accentColor ?? palette.colors.primary;
  const isSolid = variant === "solid" || variant === "primary";
  const isGhost = variant === "ghost";
  const isDestructive = variant === "destructive";
  const isIcon = variant === "icon";
  const backgroundColor = isGhost
    ? "transparent"
    : isDestructive
      ? "transparent"
    : isSolid
      ? resolvedAccent
      : isIcon && accentColor
        ? resolvedAccent
        : palette.colors.surface;
  const borderColor = isGhost
    ? palette.colors.border
    : isDestructive
      ? palette.colors.error
      : isSolid
        ? resolvedAccent
        : palette.colors.border;
  const textColor = isSolid ? palette.colors.onPrimary : isDestructive ? palette.colors.error : palette.colors.text;
  const resolvedHint =
    accessibilityHint ??
    (label ? `Activates ${label.toLowerCase()}` : "Activates this button");

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => {
        if (!onPress || disabled || loading) {
          return;
        }
        hapticTap();
        onPress();
      }}
      style={[
        {
          width: fullWidth && !isIcon ? "100%" : undefined,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label ?? "Button"}
      accessibilityHint={getAccessibilityHint(resolvedHint)}
    >
      {({ pressed }) => (
        <GlassSurface
          pressed={pressed}
          disabled={disabled || loading}
          borderRadius={999}
          backgroundColor={backgroundColor}
          borderColor={borderColor}
          style={{
            minHeight: height,
            height,
            width,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            paddingHorizontal: isIcon ? 0 : 16,
          }}
        >
          {icon ? <View>{icon}</View> : null}
          {!isIcon && label ? (
            <Text
              style={[
                {
                  color: textColor,
                  fontWeight: getFontWeight("700"),
                  fontSize: scaleFont(15),
                } as TextStyle,
                textStyle,
              ]}
            >
              {loading ? "Loading..." : label}
            </Text>
          ) : null}
        </GlassSurface>
      )}
    </Pressable>
  );
}
