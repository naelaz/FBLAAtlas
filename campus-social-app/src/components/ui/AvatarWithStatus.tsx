import { Image } from "expo-image";
import React from "react";
import { Pressable, View } from "react-native";

import { DEFAULT_IMAGE_BLURHASH, resolveAvatarUrl } from "../../constants/media";
import { useThemeContext } from "../../context/ThemeContext";

type AvatarWithStatusProps = {
  uri?: string | null;
  seed?: string;
  size?: number;
  online?: boolean;
  onPress?: () => void;
};

export function AvatarWithStatus({
  uri,
  seed,
  size = 40,
  online = false,
  onPress,
}: AvatarWithStatusProps) {
  const { palette } = useThemeContext();
  const sourceUri = resolveAvatarUrl(uri, seed ?? uri ?? "student");

  const image = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: palette.colors.surface,
      }}
    >
      <Image
        source={{ uri: sourceUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        placeholder={DEFAULT_IMAGE_BLURHASH}
        transition={300}
        cachePolicy="memory-disk"
      />
      {online ? (
        <View
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            borderRadius: Math.max(5, size * 0.14),
            width: Math.max(10, size * 0.28),
            height: Math.max(10, size * 0.28),
            backgroundColor: palette.colors.online,
            borderWidth: 2,
            borderColor: palette.colors.surface,
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
      style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
    >
      {image}
    </Pressable>
  );
}
