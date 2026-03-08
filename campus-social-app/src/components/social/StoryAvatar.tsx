import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, View } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";
import { resolveAvatarUrl } from "../../constants/media";
import { AppImage } from "../media/AppImage";

type StoryAvatarProps = {
  userName: string;
  avatarUrl?: string | null;
  seen?: boolean;
  moodEmoji?: string | null;
};

export function StoryAvatar({ userName, avatarUrl, seen = false, moodEmoji }: StoryAvatarProps) {
  const { palette } = useThemeContext();
  const label = userName.slice(0, 8);
  const resolvedAvatar = resolveAvatarUrl(avatarUrl, userName);

  return (
    <View style={{ alignItems: "center", width: 72 }}>
      {seen ? (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 3,
            borderColor: palette.colors.border,
            padding: 3,
          }}
        >
          <AppImage uri={resolvedAvatar} style={{ width: "100%", height: "100%", borderRadius: 29 }} />
        </View>
      ) : (
        <LinearGradient
          colors={[palette.colors.primary, palette.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            padding: 3,
          }}
        >
          <AppImage uri={resolvedAvatar} style={{ width: "100%", height: "100%", borderRadius: 29 }} />
        </LinearGradient>
      )}
      <Text numberOfLines={1} style={{ fontSize: 11, marginTop: 4, color: palette.colors.text }}>
        {label}
        {moodEmoji ? ` ${moodEmoji}` : ""}
      </Text>
    </View>
  );
}
