import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Text } from "react-native-paper";

import { AppLogo } from "../components/branding/AppLogo";
import { useOnboarding } from "../context/OnboardingContext";
import { useThemeContext } from "../context/ThemeContext";
import { hapticTap } from "../services/haptics";

const WIDTH = Dimensions.get("window").width;

type OnboardSlide = {
  id: string;
  title: string;
  subtitle?: string;
  body?: string;
  features?: Array<{
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
    description: string;
  }>;
};

const SLIDES: OnboardSlide[] = [
  {
    id: "welcome",
    title: "FBLA Atlas",
    subtitle: "Your school. Your community. Leveled up.",
    body: "Connect with your campus through events, clubs, stories, and Finn AI support.",
  },
  {
    id: "features",
    title: "Everything You Need",
    features: [
      {
        icon: "account-group-outline",
        label: "Connect with your school",
        description: "Follow classmates, discover clubs, and stay in sync with campus activity.",
      },
      {
        icon: "trophy-outline",
        label: "Track your XP and climb tiers",
        description: "Earn points from posts, events, and social actions to level up.",
      },
      {
        icon: "calendar-check-outline",
        label: "Never miss an event",
        description: "Get reminders and see who is going before every major event.",
      },
    ],
  },
  {
    id: "start",
    title: "Ready to Join?",
    subtitle: "Set up your FBLA Atlas account and jump into your school community.",
  },
];

export function OnboardingScreen() {
  const { completeOnboarding } = useOnboarding();
  const { palette } = useThemeContext();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<OnboardSlide>>(null);

  const shimmer = useSharedValue(0.35);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(withTiming(0.9, { duration: 2500 }), withTiming(0.35, { duration: 2500 })),
      -1,
      false,
    );
  }, [shimmer]);

  const gradientStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  const complete = () => {
    hapticTap();
    void completeOnboarding();
  };

  const goNext = () => {
    const next = Math.min(index + 1, SLIDES.length - 1);
    setIndex(next);
    listRef.current?.scrollToIndex({ index: next, animated: true });
  };

  const renderSlide = ({ item }: { item: OnboardSlide }) => {
    if (item.id === "features") {
      return (
        <View style={{ width: WIDTH, paddingHorizontal: 16, paddingTop: 28 }}>
          <Text variant="headlineMedium" style={{ color: palette.colors.text, fontWeight: "900" }}>
            {item.title}
          </Text>
          <View style={{ marginTop: 20, gap: 12 }}>
            {item.features?.map((feature) => (
              <View
                key={feature.label}
                style={{
                  borderWidth: 1,
                  borderColor: palette.colors.border,
                  borderRadius: 16,
                  backgroundColor: palette.colors.glass,
                  padding: 14,
                  flexDirection: "row",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: palette.colors.primarySoft,
                  }}
                >
                  <MaterialCommunityIcons name={feature.icon} size={22} color={palette.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.colors.text, fontWeight: "800" }}>{feature.label}</Text>
                  <Text style={{ color: palette.colors.muted, marginTop: 2 }}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (item.id === "start") {
      return (
        <View style={{ width: WIDTH, paddingHorizontal: 16, paddingTop: 28 }}>
          <Text variant="headlineMedium" style={{ color: palette.colors.text, fontWeight: "900" }}>
            {item.title}
          </Text>
          <Text style={{ color: palette.colors.muted, marginTop: 10, fontSize: 16, lineHeight: 24 }}>
            {item.subtitle}
          </Text>

          <View style={{ marginTop: 28, gap: 12 }}>
            <Button mode="contained" contentStyle={{ height: 52 }} style={{ borderRadius: 14 }} onPress={complete}>
              Sign Up
            </Button>
            <Button mode="contained-tonal" contentStyle={{ height: 52 }} style={{ borderRadius: 14 }} onPress={complete}>
              Log In
            </Button>
          </View>
        </View>
      );
    }

    return (
      <View style={{ width: WIDTH, paddingHorizontal: 16, paddingTop: 28 }}>
        <AppLogo subtitle="FBLA Competition Build" />
        <Text variant="headlineMedium" style={{ color: palette.colors.text, fontWeight: "900", marginTop: 20 }}>
          {item.title}
        </Text>
        <Text style={{ color: palette.colors.primary, marginTop: 10, fontSize: 18, fontWeight: "700" }}>
          {item.subtitle}
        </Text>
        <Text style={{ color: palette.colors.muted, marginTop: 12, fontSize: 16, lineHeight: 24 }}>
          {item.body}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }}>
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={[palette.colors.background, palette.colors.surface, palette.colors.elevated]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <Animated.View
          style={[
            {
              position: "absolute",
              top: -80,
              left: -40,
              width: 300,
              height: 300,
              borderRadius: 150,
              backgroundColor: palette.colors.primarySoft,
            },
            gradientStyle,
          ]}
        />

        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={renderSlide}
          onMomentumScrollEnd={(event) => {
            const next = Math.round(event.nativeEvent.contentOffset.x / WIDTH);
            setIndex(next);
          }}
        />

        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {SLIDES.map((item, dotIndex) => (
              <View
                key={item.id}
                style={{
                  height: 8,
                  borderRadius: 999,
                  width: dotIndex === index ? 24 : 8,
                  backgroundColor: dotIndex === index ? palette.colors.primary : palette.colors.inputMuted,
                }}
              />
            ))}
          </View>

          <View style={{ marginTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable onPress={complete} style={{ minWidth: 44, minHeight: 44, justifyContent: "center", paddingHorizontal: 6 }}>
              <Text style={{ color: palette.colors.textSecondary }}>Skip</Text>
            </Pressable>

            {index < SLIDES.length - 1 ? (
              <Button
                mode="contained"
                onPress={() => {
                  hapticTap();
                  goNext();
                }}
              >
                Next
              </Button>
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
