import React from "react";
import { Text, View, ViewStyle } from "react-native";

import { colorWithAlpha, getTierColor } from "../../constants/gamification";
import { useAccessibility } from "../../context/AccessibilityContext";
import { TierName } from "../../types/social";

type TierBadgeProps = {
  tier: TierName;
  style?: ViewStyle;
};

export function TierBadge({ tier, style }: TierBadgeProps) {
  const tierColor = getTierColor(tier);
  const { scaleFont, getFontWeight } = useAccessibility();

  return (
    <View
      style={[
        {
          borderRadius: 999,
          paddingHorizontal: 6,
          paddingVertical: 4,
          borderWidth: 1,
          borderColor: colorWithAlpha(tierColor, 0.4),
          backgroundColor: colorWithAlpha(tierColor, 0.15),
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      <Text
        style={{
          color: tierColor,
          fontWeight: getFontWeight("700"),
          fontSize: scaleFont(12),
          lineHeight: scaleFont(12),
        }}
      >
        {tier}
      </Text>
    </View>
  );
}

