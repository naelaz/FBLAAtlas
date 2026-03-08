import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";

export function ConfettiLayer({ active }: { active: boolean }) {
  const { palette } = useThemeContext();
  const progress = useRef(new Animated.Value(0)).current;
  const width = Dimensions.get("window").width;
  const colors = useMemo(
    () => [
      palette.colors.warning,
      palette.colors.success,
      palette.colors.primary,
      palette.colors.danger,
      palette.colors.secondary,
      palette.colors.info,
    ],
    [palette],
  );

  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, index) => ({
        id: index,
        left: Math.random() * (width - 20),
        rotate: Math.random() * 220,
        size: 6 + Math.random() * 8,
        color: colors[index % colors.length],
      })),
    [colors, width],
  );

  useEffect(() => {
    if (!active) {
      return;
    }

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();
  }, [active, progress]);

  if (!active) {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece) => {
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, 380],
        });

        const opacity = progress.interpolate({
          inputRange: [0, 0.75, 1],
          outputRange: [1, 1, 0],
        });

        return (
          <Animated.View
            key={piece.id}
            style={{
              position: "absolute",
              left: piece.left,
              top: -20,
              width: piece.size,
              height: piece.size,
              borderRadius: 2,
              backgroundColor: piece.color,
              opacity,
              transform: [
                { translateY },
                {
                  rotate: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", `${piece.rotate}deg`],
                  }),
                },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
