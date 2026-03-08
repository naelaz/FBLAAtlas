import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

type GlassSurfaceProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
  intensity?: number;
  borderRadius?: number;
};

export function GlassSurface({
  children,
  style,
  backgroundColor = "rgba(255,255,255,0.65)",
  borderColor = "rgba(255,255,255,0.35)",
  intensity = 46,
  borderRadius = 16,
}: GlassSurfaceProps) {
  return (
    <View
      style={[
        {
          borderRadius,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor,
          backgroundColor,
        },
        style,
      ]}
    >
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={intensity}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}

