import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { DEFAULT_IMAGE_BLURHASH, resolveAvatarUrl } from "../../constants/media";
import { useAccessibility } from "../../context/AccessibilityContext";
import { useSettings } from "../../context/SettingsContext";
import { useThemeContext } from "../../context/ThemeContext";
import { TierName } from "../../types/social";

type AvatarWithStatusProps = {
  uri?: string | null;
  seed?: string;
  size?: number;
  online?: boolean;
  onPress?: () => void;
  tier?: TierName;
};

export function AvatarWithStatus({
  uri,
  seed,
  size = 40,
  online = false,
  onPress,
}: AvatarWithStatusProps) {
  const { palette } = useThemeContext();
  const { settings } = useSettings();
  const { getAccessibilityHint } = useAccessibility();
  const resolvedSeed = seed ?? uri ?? "student";
  const sourceUri = resolveAvatarUrl(uri, resolvedSeed);
  const useInitialFallback =
    !uri || uri.trim().length === 0 || /api\.dicebear\.com\/7\.x\/initials/i.test(sourceUri);
  const dotSize = Math.max(12, Math.round(size * 0.205));
  const dotBorder = Math.max(2, Math.min(3, Math.round(size * 0.04)));
  const initialsSize = size >= 80 ? 32 : size >= 40 ? 18 : 14;
  const initials = resolvedSeed
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";

  const image = (
    <View
      style={{
        position: "relative",
        width: size,
        height: size,
      }}
    >
      <Image
        source={{ uri: sourceUri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          display: useInitialFallback ? "none" : "flex",
        }}
        contentFit="cover"
        placeholder={DEFAULT_IMAGE_BLURHASH}
        transition={300}
        cachePolicy="memory-disk"
      />
      {useInitialFallback ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: palette.colors.surfaceAlt,
            borderWidth: 1,
            borderColor: palette.colors.border,
          }}
        >
          <Text
            style={{
              color: palette.colors.textMuted,
              fontSize: initialsSize,
              fontFamily: "System",
              fontWeight: "300",
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            {initials}
          </Text>
        </View>
      ) : null}
      {online && settings.privacy.showOnlineStatus ? (
        <View
          style={{
            position: "absolute",
            right: 2,
            bottom: 2,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: palette.colors.online,
            borderWidth: dotBorder,
            borderColor: palette.colors.background,
            zIndex: 10,
          }}
        />
      ) : null}
    </View>
  );

  if (!onPress) {
    return image;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${seed ?? "User"} avatar`}
      accessibilityHint={getAccessibilityHint("Opens profile details")}
      style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
    >
      {image}
    </Pressable>
  );
}
