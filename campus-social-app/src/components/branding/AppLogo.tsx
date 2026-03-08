import React from "react";
import { Text, View } from "react-native";

import { FinnRobotIcon } from "./FinnRobotIcon";

type AppLogoProps = {
  size?: number;
  subtitle?: string;
};

export function AppLogo({ size = 38, subtitle }: AppLogoProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <FinnRobotIcon size={size} />
      <View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: "#0F172A" }}>FBLA Atlas</Text>
        {subtitle ? <Text style={{ color: "#64748B" }}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

