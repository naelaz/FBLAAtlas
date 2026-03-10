import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View, ViewStyle } from "react-native";

import { colorWithAlpha, getTierColor } from "../../constants/gamification";
import { useAccessibility } from "../../context/AccessibilityContext";
import { TierName } from "../../types/social";

type TierBadgeProps = {
  tier: TierName;
  style?: ViewStyle;
};

export function TierBadge({ tier, style }: TierBadgeProps) {
  const baseTierColor = getTierColor(tier);
  const { scaleFont, getFontWeight, colorBlindMode } = useAccessibility();
  const tierLetter =
    tier === "Bronze"
      ? "B"
      : tier === "Silver"
        ? "S"
        : tier === "Gold"
          ? "G"
          : tier === "Platinum"
            ? "P"
            : tier === "Diamond"
              ? "D"
              : "L";

  const tierColor =
    colorBlindMode === "deuteranopia"
      ? ({
          Bronze: "#8b7f73",
          Silver: "#8f8f8f",
          Gold: "#b39245",
          Platinum: "#4e7ea8",
          Diamond: "#6f66aa",
          Legend: "#8e6b4e",
        }[tier] ?? baseTierColor)
      : colorBlindMode === "protanopia"
        ? ({
            Bronze: "#897a68",
            Silver: "#8f8f8f",
            Gold: "#b0903e",
            Platinum: "#477ba8",
            Diamond: "#7e6eb0",
            Legend: "#8d6c46",
          }[tier] ?? baseTierColor)
        : colorBlindMode === "tritanopia"
          ? ({
              Bronze: "#8a7a68",
              Silver: "#919191",
              Gold: "#ae8e3f",
              Platinum: "#7d8a95",
              Diamond: "#875f8f",
              Legend: "#8f6a48",
            }[tier] ?? baseTierColor)
          : baseTierColor;

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
          overflow: "hidden",
        },
        style,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[colorWithAlpha(tierColor, 0.2), colorWithAlpha(tierColor, 0.08)]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {colorBlindMode !== "none" ? (
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              borderWidth: 1,
              borderColor: colorWithAlpha(tierColor, 0.55),
              backgroundColor: colorWithAlpha(tierColor, 0.22),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: tierColor,
                fontWeight: getFontWeight("700"),
                fontSize: scaleFont(9),
                lineHeight: scaleFont(9),
              }}
            >
              {tierLetter}
            </Text>
          </View>
        ) : null}
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
    </View>
  );
}
