import React from "react";
import { Pressable, StyleProp, TextStyle, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";

import { useThemeContext } from "../../context/ThemeContext";
import { hapticTap } from "../../services/haptics";
import { GlassSurface } from "./GlassSurface";

export type GlassButtonVariant = "primary" | "solid" | "ghost" | "icon" | "pill-sm";
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
};

const BUTTON_HEIGHTS: Record<GlassButtonSize, number> = {
  sm: 38,
  md: 48,
  lg: 52,
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
}: GlassButtonProps) {
  const { palette } = useThemeContext();
  const height = variant === "pill-sm" ? 32 : variant === "icon" ? 44 : BUTTON_HEIGHTS[size];
  const width = variant === "icon" ? 44 : undefined;
  const resolvedAccent = accentColor ?? palette.colors.primary;
  const isSolid = variant === "solid";
  const isGhost = variant === "ghost";
  const isIcon = variant === "icon";

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
    >
      {({ pressed }) => (
        <GlassSurface
          pressed={pressed}
          disabled={disabled || loading}
          borderRadius={999}
          backgroundColor={isSolid ? resolvedAccent : isGhost ? "transparent" : palette.colors.inputSurface}
          borderColor={isGhost ? palette.colors.border : palette.colors.border}
          style={{
            minHeight: height,
            height,
            width,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            paddingHorizontal: isIcon ? 0 : variant === "pill-sm" ? 10 : 14,
          }}
        >
          {icon ? <View>{icon}</View> : null}
          {!isIcon && label ? (
            <Text
              style={[
                {
                  color: isSolid ? palette.colors.onPrimary : palette.colors.text,
                  fontWeight: "700",
                  fontSize: variant === "pill-sm" ? 12 : 15,
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
