import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

type AvatarWithStatusProps = {
  uri: string;
  size?: number;
  online?: boolean;
  onPress?: () => void;
};

export function AvatarWithStatus({
  uri,
  size = 40,
  online = false,
  onPress,
}: AvatarWithStatusProps) {
  const image = (
    <View style={[styles.avatarWrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image source={uri} style={{ width: size, height: size, borderRadius: size / 2 }} />
      {online ? (
        <View
          style={[
            styles.onlineDot,
            {
              right: 0,
              bottom: 0,
              borderRadius: Math.max(5, size * 0.14),
              width: Math.max(10, size * 0.28),
              height: Math.max(10, size * 0.28),
            },
          ]}
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

const styles = StyleSheet.create({
  avatarWrap: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
  },
  onlineDot: {
    position: "absolute",
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "white",
  },
});

