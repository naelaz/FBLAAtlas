import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useThemeContext } from "../context/ThemeContext";

type FinnInputProps = {
  placeholders: string[];
  disabled?: boolean;
  onChangeText?: (text: string) => void;
  onSubmit: (text: string) => void;
};

const PILL_HEIGHT = 56;

export function FinnInput({
  placeholders,
  disabled = false,
  onChangeText,
  onSubmit,
}: FinnInputProps) {
  const { palette } = useThemeContext();
  const inputRef = useRef<TextInput>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPlaceholderRef = useRef(0);
  const valueRef = useRef("");
  const animatingRef = useRef(false);

  const [value, setValue] = useState("");
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [vanishingText, setVanishingText] = useState("");

  const placeholderOpacity = useSharedValue(1);
  const placeholderTranslateY = useSharedValue(0);
  const vanishOpacity = useSharedValue(0);
  const vanishTranslateX = useSharedValue(0);
  const vanishTranslateY = useSharedValue(0);
  const vanishScale = useSharedValue(1);
  const sendScale = useSharedValue(1);
  const lineProgress = useSharedValue(0);

  useEffect(() => {
    valueRef.current = value;
    lineProgress.value = withTiming(value.trim().length > 0 ? 1 : 0, {
      duration: 220,
      easing: Easing.linear,
    });
  }, [value, lineProgress]);

  useEffect(() => {
    animatingRef.current = animating;
  }, [animating]);

  const finishVanish = () => {
    setAnimating(false);
    setVanishingText("");
  };

  const animateToNextPlaceholder = () => {
    if (placeholders.length <= 1) {
      return;
    }
    if (valueRef.current.length > 0 || animatingRef.current) {
      return;
    }

    placeholderOpacity.value = withTiming(0, { duration: 170, easing: Easing.linear });
    placeholderTranslateY.value = withTiming(-14, { duration: 170, easing: Easing.linear });

    setTimeout(() => {
      const next = (currentPlaceholderRef.current + 1) % placeholders.length;
      currentPlaceholderRef.current = next;
      setCurrentPlaceholder(next);
      placeholderTranslateY.value = 6;
      placeholderOpacity.value = 0;
      placeholderTranslateY.value = withTiming(0, { duration: 220, easing: Easing.linear });
      placeholderOpacity.value = withTiming(1, { duration: 220, easing: Easing.linear });
    }, 175);
  };

  useEffect(() => {
    const startLoop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(() => {
        if (appStateRef.current === "active") {
          animateToNextPlaceholder();
        }
      }, 3000);
    };

    startLoop();

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      appStateRef.current = state;
      if (state === "active") {
        startLoop();
      } else if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    });

    return () => {
      appStateSubscription.remove();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [placeholders.length]);

  const placeholderStyle = useAnimatedStyle(() => ({
    opacity: placeholderOpacity.value,
    transform: [{ translateY: placeholderTranslateY.value }],
  }));

  const vanishStyle = useAnimatedStyle(() => ({
    opacity: vanishOpacity.value,
    transform: [
      { translateX: vanishTranslateX.value },
      { translateY: vanishTranslateY.value },
      { scale: vanishScale.value },
    ],
  }));

  const sendButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    width: 10 * lineProgress.value,
    opacity: lineProgress.value,
  }));

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || animatingRef.current) {
      return;
    }

    setAnimating(true);
    setVanishingText(trimmed);
    setValue("");
    onChangeText?.("");
    onSubmit(trimmed);

    vanishOpacity.value = 1;
    vanishTranslateX.value = 0;
    vanishTranslateY.value = 0;
    vanishScale.value = 1;

    vanishOpacity.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) {
        runOnJS(finishVanish)();
      }
    });
    vanishTranslateX.value = withTiming(18, { duration: 420, easing: Easing.out(Easing.quad) });
    vanishTranslateY.value = withTiming(-10, { duration: 420, easing: Easing.out(Easing.quad) });
    vanishScale.value = withTiming(0.94, { duration: 420, easing: Easing.out(Easing.quad) });
  };

  const showPlaceholder = value.length === 0 && !animating && !disabled;

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: palette.colors.glass,
          borderColor: palette.colors.glassBorder,
          shadowColor: palette.colors.primary,
        },
      ]}
    >
      <BlurView
        intensity={Platform.OS === "ios" ? 48 : 24}
        tint={palette.isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />

      {showPlaceholder ? (
        <Animated.Text
          style={[
            styles.placeholder,
            placeholderStyle,
            {
              color: palette.colors.muted,
            },
          ]}
          numberOfLines={1}
          pointerEvents="none"
        >
          {placeholders[currentPlaceholder]}
        </Animated.Text>
      ) : null}

      {vanishingText.length > 0 ? (
        <Animated.Text
          style={[
            styles.vanishText,
            vanishStyle,
            {
              color: palette.colors.text,
            },
          ]}
          numberOfLines={1}
          pointerEvents="none"
        >
          {vanishingText}
        </Animated.Text>
      ) : null}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(nextText) => {
          if (animatingRef.current || disabled) {
            return;
          }
          setValue(nextText);
          onChangeText?.(nextText);
        }}
        onSubmitEditing={() => submit()}
        blurOnSubmit={false}
        editable={!disabled}
        returnKeyType="send"
        style={[
          styles.input,
          {
            color: animating ? "transparent" : palette.colors.text,
          },
        ]}
        placeholder=""
        accessibilityLabel="Ask Finn"
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send message to Finn"
        disabled={disabled || value.trim().length === 0}
        onPressIn={() => {
          sendScale.value = withSpring(0.96, { damping: 10, stiffness: 260 });
        }}
        onPressOut={() => {
          sendScale.value = withSpring(1, { damping: 12, stiffness: 220 });
        }}
        onPress={() => {
          submit();
        }}
        style={({ pressed }) => [
          styles.sendButton,
          {
            backgroundColor:
              disabled || value.trim().length === 0
                ? palette.colors.inputMuted
                : palette.colors.primary,
            opacity: pressed ? 0.95 : 1,
          },
        ]}
      >
        <Animated.View style={[styles.sendInner, sendButtonStyle]}>
          <Animated.View
            style={[
              styles.sendLine,
              lineStyle,
              {
                backgroundColor:
                  disabled || value.trim().length === 0
                    ? palette.colors.muted
                    : palette.colors.onPrimary,
              },
            ]}
          />
          <MaterialCommunityIcons
            name="arrow-right"
            size={18}
            color={disabled || value.trim().length === 0 ? palette.colors.muted : palette.colors.onPrimary}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: PILL_HEIGHT,
    height: PILL_HEIGHT,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  input: {
    height: PILL_HEIGHT,
    paddingLeft: 16,
    paddingRight: 78,
    fontSize: 15,
  },
  placeholder: {
    position: "absolute",
    left: 16,
    right: 78,
    fontSize: 15,
  },
  vanishText: {
    position: "absolute",
    left: 16,
    right: 78,
    fontSize: 15,
  },
  sendButton: {
    position: "absolute",
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sendLine: {
    height: 2,
    borderRadius: 2,
    marginRight: 3,
  },
});
