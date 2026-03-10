import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAccessibility } from "../context/AccessibilityContext";
import { useAnimationDuration } from "../hooks/useAnimationDuration";
import { handleDailyLogin } from "../services/gamificationService";
import { hapticSuccess } from "../services/haptics";
import { sendLocalPush } from "../services/pushService";
import { PointAction, PointAwardResult } from "../types/social";
import { useAuthContext } from "./AuthContext";
import { useOnboarding } from "./OnboardingContext";
import { usePushNotifications } from "./PushNotificationsContext";
import { useSettings } from "./SettingsContext";
import { useThemeContext } from "./ThemeContext";

type TierUpgradeState = {
  fromTier: string;
  toTier: string;
};

type XpToastState = {
  id: string;
  points: number;
  color: string;
  message: string;
};

type AwardMessageOptions = {
  eventName?: string;
  customMessage?: string;
};

type GamificationContextValue = {
  handleAwardResult: (
    result: PointAwardResult | null | undefined,
    options?: AwardMessageOptions,
  ) => void;
};

const GamificationContext = createContext<GamificationContextValue | undefined>(undefined);
const TOAST_COOLDOWN_MS = 3000;
const meaningfulXpActions: ReadonlySet<PointAction> = new Set([
  "daily_login",
  "complete_practice_test",
  "score_90_bonus",
  "complete_flashcard_deck",
  "complete_presentation",
  "complete_mock_judge",
  "seven_day_streak_bonus",
  "perfect_test_score",
  "first_post_bonus",
  "profile_completed_bonus",
]);

function formatAwardMessage(
  action: PointAction,
  pointsAwarded: number,
  options?: AwardMessageOptions,
  streakCount?: number,
): string {
  if (options?.customMessage) {
    return options.customMessage;
  }

  switch (action) {
    case "attending_event":
      return `+${pointsAwarded} XP - You're going to ${options?.eventName ?? "that event"}!`;
    case "posting":
      return `+${pointsAwarded} XP - Nice post!`;
    case "commenting":
      return `+${pointsAwarded} XP - Keep the convo going!`;
    case "likes_received":
      return `+${pointsAwarded} XP - Someone liked your post!`;
    case "liking_post":
      return `+${pointsAwarded} XP - You liked a post.`;
    case "daily_login":
      return `+${pointsAwarded} XP - Day ${streakCount ?? 1} streak!`;
    case "following_user":
      return `+${pointsAwarded} XP - Growing your network!`;
    case "messaging_new":
      return `+${pointsAwarded} XP - New conversation started!`;
    case "complete_practice_test":
      return `+${pointsAwarded} XP - Practice test complete!`;
    case "score_90_bonus":
      return `+${pointsAwarded} XP - 90%+ bonus unlocked!`;
    case "complete_flashcard_deck":
      return `+${pointsAwarded} XP - Flashcard deck complete!`;
    case "complete_presentation":
      return `+${pointsAwarded} XP - Presentation practice complete!`;
    case "complete_mock_judge":
      return `+${pointsAwarded} XP - Mock judge session complete!`;
    case "seven_day_streak_bonus":
      return `+${pointsAwarded} XP - 7-day streak bonus!`;
    case "perfect_test_score":
      return `+${pointsAwarded} XP - Perfect score bonus!`;
    case "first_post_bonus":
      return `+${pointsAwarded} XP - First post bonus!`;
    case "profile_completed_bonus":
      return `+${pointsAwarded} XP - Profile completed!`;
    default:
      return `+${pointsAwarded} XP`;
  }
}

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthContext();
  const { completed: onboardingCompleted } = useOnboarding();
  const { enabled: pushEnabled } = usePushNotifications();
  const { settings } = useSettings();
  const { palette } = useThemeContext();
  const { scaleFont, getFontWeight } = useAccessibility();
  const toastEnterDuration = useAnimationDuration(400);
  const toastExitDuration = useAnimationDuration(300);
  const tierEnterDuration = useAnimationDuration(420);
  const tierExitDuration = useAnimationDuration(320);
  const insets = useSafeAreaInsets();

  const [queue, setQueue] = useState<XpToastState[]>([]);
  const [activeToast, setActiveToast] = useState<XpToastState | null>(null);
  const [tierUpgrade, setTierUpgrade] = useState<TierUpgradeState | null>(null);
  const lastToastAt = useRef(0);
  const toastTranslateY = useSharedValue(-150);
  const tierBannerTranslateY = useSharedValue(-150);

  const animatedToastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastTranslateY.value }],
  }));
  const animatedTierBannerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tierBannerTranslateY.value }],
  }));

  const enqueueToast = useCallback((points: number, color: string, message: string) => {
    const now = Date.now();
    if (now - lastToastAt.current < TOAST_COOLDOWN_MS) {
      return;
    }
    lastToastAt.current = now;
    setQueue((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        points,
        color,
        message,
      },
    ]);
  }, []);

  useEffect(() => {
    if (activeToast || queue.length === 0) {
      return;
    }

    const [next, ...rest] = queue;
    setQueue(rest);
    setActiveToast(next);
  }, [activeToast, queue]);

  useEffect(() => {
    if (!activeToast) {
      return;
    }

    toastTranslateY.value = -150;
    toastTranslateY.value = withTiming(0, {
      duration: toastEnterDuration,
      easing: Easing.out(Easing.back(1.5)),
    });

    const timer = setTimeout(() => {
      toastTranslateY.value = withTiming(
        -150,
        {
          duration: toastExitDuration,
          easing: Easing.in(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(setActiveToast)(null);
          }
        },
      );
    }, 3500);

    return () => {
      clearTimeout(timer);
      cancelAnimation(toastTranslateY);
    };
  }, [activeToast, toastEnterDuration, toastExitDuration, toastTranslateY]);

  useEffect(() => {
    if (!tierUpgrade) {
      return;
    }

    tierBannerTranslateY.value = -150;
    tierBannerTranslateY.value = withTiming(0, {
      duration: tierEnterDuration,
      easing: Easing.out(Easing.back(1.5)),
    });

    const timer = setTimeout(() => {
      tierBannerTranslateY.value = withTiming(
        -150,
        { duration: tierExitDuration, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(setTierUpgrade)(null);
          }
        },
      );
    }, 2600);

    return () => {
      clearTimeout(timer);
      cancelAnimation(tierBannerTranslateY);
    };
  }, [tierBannerTranslateY, tierEnterDuration, tierExitDuration, tierUpgrade]);

  const toastDayMatch = activeToast?.message.match(/Day\s+\d+/i)?.[0] ?? null;
  const toastStreakText = toastDayMatch ? `${toastDayMatch}` : "Progress update";
  const toastXpText = `+${activeToast?.points ?? 0} XP`;
  const toastSubtitle =
    toastDayMatch ? "Welcome back. Keep your streak alive." : "XP earned. Keep building momentum.";

  const handleAwardResult = useCallback(
    (result: PointAwardResult | null | undefined, options?: AwardMessageOptions) => {
      if (!result) {
        return;
      }

      if (result.pointsAwarded > 0 && settings.notifications.xpAlerts && meaningfulXpActions.has(result.action)) {
        const message = formatAwardMessage(
          result.action,
          result.pointsAwarded,
          options,
          result.streakCount,
        );

        enqueueToast(result.pointsAwarded, result.newTier.color, message);

        if (pushEnabled && settings.notifications.globalPush) {
          void sendLocalPush("XP Earned", message);
        }
      }

      if (result.tierUpgraded) {
        hapticSuccess();
        setTierUpgrade({
          fromTier: result.previousTier.name,
          toTier: result.newTier.name,
        });

        if (pushEnabled && settings.notifications.globalPush && settings.notifications.xpAlerts) {
          void sendLocalPush(
            "Tier Upgrade",
            `You reached ${result.newTier.name}! Keep it up!`,
          );
        }
      }

      if (
        typeof result.streakCount === "number" &&
        result.streakCount > 1 &&
        result.streakCount % 7 === 0 &&
        pushEnabled &&
        settings.notifications.globalPush &&
        settings.notifications.xpAlerts
      ) {
        void sendLocalPush("Daily Streak", `Day ${result.streakCount} streak!`);
      }
    },
    [enqueueToast, pushEnabled, settings.notifications.globalPush, settings.notifications.xpAlerts],
  );
  const handleAwardResultRef = useRef(handleAwardResult);
  useEffect(() => {
    handleAwardResultRef.current = handleAwardResult;
  }, [handleAwardResult]);

  useEffect(() => {
    if (!profile || !onboardingCompleted) {
      return;
    }

    let cancelled = false;

    const runDailyReward = async () => {
      try {
        const result = await handleDailyLogin(profile.uid);
        if (!cancelled && result) {
          handleAwardResultRef.current(result);
        }
      } catch (error) {
        console.warn("Daily login reward failed:", error);
      }
    };

    void runDailyReward();

    return () => {
      cancelled = true;
    };
  }, [profile?.uid, onboardingCompleted]);

  const value = useMemo(() => ({ handleAwardResult }), [handleAwardResult]);

  return (
    <GamificationContext.Provider value={value}>
      {children}

      {activeToast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: 16,
              right: 16,
              top: insets.top + 8,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: activeToast.color,
              backgroundColor: palette.colors.surface,
              paddingHorizontal: 14,
              paddingVertical: 12,
              shadowColor: palette.colors.background,
              shadowOpacity: 0.25,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            },
            animatedToastStyle,
          ]}
        >
          <Text
            style={{
              color: palette.colors.text,
              fontWeight: getFontWeight("700"),
              marginBottom: 2,
              fontSize: scaleFont(15),
            }}
          >
            {toastStreakText}
          </Text>
          <Text
            style={{
              color: palette.colors.warning,
              fontWeight: getFontWeight("700"),
              marginBottom: 2,
              fontSize: scaleFont(15),
            }}
          >
            {toastXpText}
          </Text>
          <Text
            style={{
              color: palette.colors.textSecondary,
              fontSize: scaleFont(13),
              fontWeight: getFontWeight("500"),
            }}
          >
            {toastSubtitle}
          </Text>
        </Animated.View>
      ) : null}

      {tierUpgrade ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: 16,
              right: 16,
              top: insets.top + 8,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: palette.colors.border,
              backgroundColor: palette.colors.surface,
              paddingHorizontal: 14,
              paddingVertical: 12,
              shadowColor: palette.colors.background,
              shadowOpacity: 0.25,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            },
            animatedTierBannerStyle,
          ]}
        >
          <Text
            style={{
              color: palette.colors.text,
              fontWeight: getFontWeight("700"),
              fontSize: scaleFont(16),
            }}
          >
            You reached {tierUpgrade.toTier}!
          </Text>
          <Text
            style={{
              color: palette.colors.textMuted,
              fontSize: scaleFont(13),
              marginTop: 2,
              fontWeight: getFontWeight("500"),
            }}
          >
            Keep stacking points and move to the next tier.
          </Text>
        </Animated.View>
      ) : null}
    </GamificationContext.Provider>
  );
}

export function useGamification(): GamificationContextValue {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error("useGamification must be used within GamificationProvider");
  }
  return context;
}

