import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const COLORS = ["#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#9333EA", "#EC4899"];

export function ConfettiLayer({ active }: { active: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;
  const width = Dimensions.get("window").width;

  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, index) => ({
        id: index,
        left: Math.random() * (width - 20),
        delay: Math.random() * 250,
        duration: 700 + Math.random() * 700,
        size: 6 + Math.random() * 8,
        rotate: Math.random() * 220,
        color: COLORS[index % COLORS.length],
      })),
    [width],
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
