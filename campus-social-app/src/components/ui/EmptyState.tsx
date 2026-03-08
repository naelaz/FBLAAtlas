import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

import { FinnRobotIcon } from "../branding/FinnRobotIcon";
import { useThemeContext } from "../../context/ThemeContext";

type EmptyStateProps = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  const { palette } = useThemeContext();

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 24,
      }}
      >
      <FinnRobotIcon size={44} />
      <Text style={{ fontSize: 17, fontWeight: "700", color: palette.colors.text }}>{title}</Text>
      <Text style={{ textAlign: "center", color: palette.colors.muted, maxWidth: 280 }}>{message}</Text>
    </View>
  );
}
