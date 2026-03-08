import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react-native";
import { StyleProp, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useThemeContext } from "../../context/ThemeContext";
import { GlassButton } from "./GlassButton";
import { GlassSurface } from "./GlassSurface";

type GlassInputVariant = "form" | "vanish";

type GlassInputProps = TextInputProps & {
  variant?: GlassInputVariant;
  label?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputWrapperStyle?: StyleProp<ViewStyle>;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  placeholders?: string[];
  onVanishSubmit?: (value: string) => void;
  accentColor?: string;
};

export function GlassInput({
  variant = "form",
  label,
  disabled = false,
  containerStyle,
  inputWrapperStyle,
  leftSlot,
  rightSlot,
  placeholders = [],
  onVanishSubmit,
  accentColor,
  style,
  multiline,
  value,
  onChangeText,
  ...rest
}: GlassInputProps) {
  const { palette } = useThemeContext();
  const isVanish = variant === "vanish";
  const [innerValue, setInnerValue] = useState(typeof value === "string" ? value : "");
  const [activePlaceholderIndex, setActivePlaceholderIndex] = useState(0);
  const [previousPlaceholderIndex, setPreviousPlaceholderIndex] = useState<number | null>(null);
  const resolvedValue = typeof value === "string" ? value : innerValue;
  const minHeight = multiline ? 120 : 52;
  const transitionCleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outgoingTranslateY = useSharedValue(0);
  const outgoingOpacity = useSharedValue(0);
  const incomingTranslateY = useSharedValue(0);
  const incomingOpacity = useSharedValue(1);

  useEffect(() => {
    if (typeof value === "string") {
      setInnerValue(value);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (transitionCleanupRef.current) {
        clearTimeout(transitionCleanupRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVanish) {
      return;
    }

    if (resolvedValue.length > 0) {
      if (transitionCleanupRef.current) {
        clearTimeout(transitionCleanupRef.current);
        transitionCleanupRef.current = null;
      }
      setPreviousPlaceholderIndex(null);
      cancelAnimation(outgoingTranslateY);
      cancelAnimation(outgoingOpacity);
      cancelAnimation(incomingTranslateY);
      cancelAnimation(incomingOpacity);
      outgoingTranslateY.value = 0;
      outgoingOpacity.value = 0;
      incomingTranslateY.value = 0;
      incomingOpacity.value = 0;
      return;
    }

    outgoingTranslateY.value = 0;
    outgoingOpacity.value = 0;
    incomingTranslateY.value = 0;
    incomingOpacity.value = 1;
  }, [
    incomingOpacity,
    incomingTranslateY,
    isVanish,
    outgoingOpacity,
    outgoingTranslateY,
    resolvedValue.length,
  ]);

  useEffect(() => {
    if (!isVanish || placeholders.length <= 1 || resolvedValue.length > 0) {
      return;
    }

    const id = setInterval(() => {
      setActivePlaceholderIndex((prev) => {
        const next = (prev + 1) % placeholders.length;
        setPreviousPlaceholderIndex(prev);

        outgoingTranslateY.value = 0;
        outgoingOpacity.value = 1;
        incomingTranslateY.value = 20;
        incomingOpacity.value = 0;

        outgoingTranslateY.value = withTiming(-20, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });
        outgoingOpacity.value = withTiming(0, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });

        incomingTranslateY.value = withDelay(
          100,
          withTiming(0, {
            duration: 250,
            easing: Easing.out(Easing.cubic),
          }),
        );
        incomingOpacity.value = withDelay(
          100,
          withTiming(1, {
            duration: 250,
            easing: Easing.out(Easing.cubic),
          }),
        );

        if (transitionCleanupRef.current) {
          clearTimeout(transitionCleanupRef.current);
        }
        transitionCleanupRef.current = setTimeout(() => {
          setPreviousPlaceholderIndex(null);
        }, 420);

        return next;
      });
    }, 3000);

    return () => clearInterval(id);
  }, [
    incomingOpacity,
    incomingTranslateY,
    isVanish,
    outgoingOpacity,
    outgoingTranslateY,
    placeholders.length,
    resolvedValue.length,
  ]);

  const activePlaceholder = useMemo(
    () =>
      placeholders.length > 0
        ? placeholders[activePlaceholderIndex % placeholders.length]
        : rest.placeholder ?? "",
    [activePlaceholderIndex, placeholders, rest.placeholder],
  );
  const previousPlaceholder = useMemo(() => {
    if (previousPlaceholderIndex === null || placeholders.length === 0) {
      return null;
    }
    return placeholders[previousPlaceholderIndex % placeholders.length];
  }, [placeholders, previousPlaceholderIndex]);

  const outgoingPlaceholderStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: outgoingTranslateY.value }],
    opacity: outgoingOpacity.value,
  }));

  const incomingPlaceholderStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: incomingTranslateY.value }],
    opacity: incomingOpacity.value,
  }));

  const setValueAndNotify = (nextValue: string) => {
    if (typeof value !== "string") {
      setInnerValue(nextValue);
    }
    onChangeText?.(nextValue);
  };

  const runSubmit = () => {
    const trimmed = resolvedValue.trim();
    if (!trimmed || disabled) {
      return;
    }
    onVanishSubmit?.(trimmed);
    setValueAndNotify("");
    rest.onSubmitEditing?.({ nativeEvent: { text: trimmed } } as never);
  };

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <Text
          style={{
            color: palette.colors.textSecondary,
            fontSize: 12,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>
      ) : null}

      <GlassSurface
        borderRadius={12}
        style={[
          {
            minHeight,
            borderRadius: multiline ? 12 : 999,
            paddingHorizontal: 14,
            paddingVertical: multiline ? 12 : 0,
            flexDirection: "row",
            alignItems: multiline ? "flex-start" : "center",
            gap: 8,
            backgroundColor: palette.colors.inputSurface,
            overflow: "hidden",
          },
          inputWrapperStyle,
        ]}
      >
        {leftSlot ? <View>{leftSlot}</View> : null}

        <View style={{ flex: 1, justifyContent: "center", minHeight: multiline ? 100 : 52 }}>
          {isVanish && resolvedValue.length === 0 ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 24,
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {previousPlaceholder ? (
                <Animated.Text
                  style={[
                    {
                      position: "absolute",
                      left: 0,
                      right: 0,
                      color: palette.colors.placeholder,
                      fontSize: 15,
                    },
                    outgoingPlaceholderStyle,
                  ]}
                  numberOfLines={1}
                >
                  {previousPlaceholder}
                </Animated.Text>
              ) : null}
              <Animated.Text
                style={[
                  {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    color: palette.colors.placeholder,
                    fontSize: 15,
                  },
                  incomingPlaceholderStyle,
                ]}
                numberOfLines={1}
              >
                {activePlaceholder}
              </Animated.Text>
            </View>
          ) : null}
          <TextInput
            {...rest}
            value={resolvedValue}
            multiline={multiline}
            placeholder={isVanish ? "" : rest.placeholder}
            placeholderTextColor={palette.colors.placeholder}
            onChangeText={(nextValue) => {
              if (disabled) {
                return;
              }
              setValueAndNotify(nextValue);
            }}
            editable={!disabled && rest.editable !== false}
            onSubmitEditing={(event) => {
              if (isVanish) {
                runSubmit();
                return;
              }
              rest.onSubmitEditing?.(event);
            }}
            style={[
              {
                flex: 1,
                minHeight: multiline ? 100 : 52,
                color: palette.colors.text,
                fontSize: 15,
                paddingVertical: multiline ? 6 : 14,
              },
              style,
            ]}
          />
        </View>

        {isVanish ? (
          <GlassButton
            variant="icon"
            icon={rightSlot ?? <ArrowRight size={16} color={palette.colors.text} />}
            onPress={runSubmit}
            disabled={disabled || resolvedValue.trim().length === 0}
            fullWidth={false}
            accentColor={accentColor}
          />
        ) : rightSlot ? (
          <View>{rightSlot}</View>
        ) : null}
      </GlassSurface>
    </View>
  );
}
