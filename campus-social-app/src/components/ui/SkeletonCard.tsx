import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useThemeContext } from "../../context/ThemeContext";

export function SkeletonCard({ height = 96 }: { height?: number }) {
  const { palette } = useThemeContext();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.68, { duration: 600 }), withTiming(0.36, { duration: 800 })),
      -1,
      false,
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          height,
          borderRadius: 14,
          backgroundColor: palette.isDark ? "rgba(148,163,184,0.18)" : "#E2E8F0",
          marginBottom: 10,
        },
      ]}
    >
      <View style={{ flex: 1 }} />
    </Animated.View>
  );
}
