import React from "react";
import { Compass } from "lucide-react-native";
import { Text, View } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";

type AppLogoProps = {
  size?: number;
  subtitle?: string;
};

export function AppLogo({ size = 38, subtitle }: AppLogoProps) {
  const { palette } = useThemeContext();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: size + 8,
          height: size + 8,
          borderRadius: (size + 8) / 2,
          backgroundColor: palette.colors.surface,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: palette.colors.border,
        }}
      >
        <Compass size={Math.max(18, size - 10)} color={palette.colors.text} strokeWidth={2} />
      </View>
      <View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: palette.colors.text }}>FBLA Atlas</Text>
        {subtitle ? <Text style={{ color: palette.colors.textSecondary }}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}
