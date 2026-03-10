import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { useThemeContext } from "../../context/ThemeContext";

export function SkeletonCard({ height = 96 }: { height?: number }) {
  const { palette } = useThemeContext();
  const shimmerX = useSharedValue(-160);

  React.useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(240, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [shimmerX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <View
      style={{
        height,
        borderRadius: 16,
        backgroundColor: palette.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: palette.colors.border,
        overflow: "hidden",
        marginBottom: 10,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 180,
            opacity: palette.isDark ? 0.2 : 0.14,
          },
          shimmerStyle,
        ]}
      >
        <LinearGradient
          colors={[palette.colors.surfaceAlt, palette.colors.surface, palette.colors.surfaceAlt]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
