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
        gap: 10,
        paddingVertical: 28,
        paddingHorizontal: 16,
      }}
      >
      <FinnRobotIcon size={48} />
      <Text style={{ fontSize: 16, fontWeight: "600", color: palette.colors.text }}>{title}</Text>
      <Text style={{ textAlign: "center", color: palette.colors.textMuted, fontSize: 14, maxWidth: 280 }}>
        {message}
      </Text>
    </View>
  );
}
