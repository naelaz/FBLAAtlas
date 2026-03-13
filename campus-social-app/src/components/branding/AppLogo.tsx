import { LinearGradient } from "expo-linear-gradient";
import { Compass } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";

type AppLogoProps = {
  size?: number;
  subtitle?: string;
  /** "row" = icon left + text right (default). "stack" = icon above text, centered. */
  layout?: "row" | "stack";
};

export function AppLogo({ size = 38, subtitle, layout = "row" }: AppLogoProps) {
  const { palette } = useThemeContext();
  const iconSize = Math.max(16, size - 8);
  const circleSize = size + 10;
  const primary = palette.colors.primary;

  const circle = (
    <View
      style={{
        width: circleSize,
        height: circleSize,
        borderRadius: circleSize / 2,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderWidth: 1.5,
        borderColor: primary + "55",
        shadowColor: primary,
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
      }}
    >
      <LinearGradient
        colors={[primary + "33", primary + "11"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <Compass size={iconSize} color={primary} strokeWidth={2} />
    </View>
  );

  const titleSize = Math.max(14, Math.round(size * 0.55));

  const textBlock = (
    <View style={layout === "stack" ? { alignItems: "center", marginTop: 10 } : undefined}>
      <Text
        style={{
          fontSize: titleSize,
          fontWeight: "800",
          color: palette.colors.text,
          letterSpacing: 0.3,
        }}
      >
        FBLA{" "}
        <Text style={{ color: primary }}>Atlas</Text>
      </Text>
      {subtitle ? (
        <Text
          style={{
            color: palette.colors.textMuted,
            fontSize: Math.max(11, titleSize - 6),
            marginTop: 2,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  if (layout === "stack") {
    return (
      <View style={{ alignItems: "center" }}>
        {circle}
        {textBlock}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {circle}
      {textBlock}
    </View>
  );
}
