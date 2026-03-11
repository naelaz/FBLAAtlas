import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { DEFAULT_IMAGE_BLURHASH, resolveAvatarUrl } from "../../constants/media";
import { useAccessibility } from "../../context/AccessibilityContext";
import { useSettings } from "../../context/SettingsContext";
import { useThemeContext } from "../../context/ThemeContext";
import { TierName } from "../../types/social";

// Vivid palette used for seeded avatar colors
const AVATAR_COLORS = [
  "#5B6AF7", // indigo
  "#A855F7", // purple
  "#EC4899", // pink
  "#F43F5E", // rose
  "#F97316", // orange
  "#EAB308", // amber
  "#22C55E", // green
  "#14B8A6", // teal
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#10B981", // emerald
];

/** Returns a deterministic vivid color from a seed string */
export function getSeededAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** All available avatar accent colors (for the picker) */
export { AVATAR_COLORS };

type AvatarWithStatusProps = {
  uri?: string | null;
  seed?: string;
  size?: number;
  online?: boolean;
  onPress?: () => void;
  tier?: TierName;
  /** Explicit background color for the initials circle. Overrides seeded color. */
  avatarColor?: string;
};

export function AvatarWithStatus({
  uri,
  seed,
  size = 40,
  online = false,
  onPress,
  avatarColor,
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
  const initialsSize = size >= 80 ? 30 : size >= 40 ? 16 : 13;
  const initials = resolvedSeed
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";

  // Use explicit color prop, then fall back to seeded color
  const bgColor = avatarColor || getSeededAvatarColor(resolvedSeed);

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
            backgroundColor: bgColor,
          }}
        >
          <Text
            style={{
              color: "#ffffff",
              fontSize: initialsSize,
              fontFamily: "System",
              fontWeight: "700",
              letterSpacing: 0.5,
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
