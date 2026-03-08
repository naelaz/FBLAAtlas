import React from "react";
import { Text, View } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";
import { FinnRobotIcon } from "./FinnRobotIcon";

type AppLogoProps = {
  size?: number;
  subtitle?: string;
};

export function AppLogo({ size = 38, subtitle }: AppLogoProps) {
  const { palette } = useThemeContext();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <FinnRobotIcon size={size} />
      <View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: palette.colors.text }}>FBLA Atlas</Text>
        {subtitle ? <Text style={{ color: palette.colors.textSecondary }}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}
