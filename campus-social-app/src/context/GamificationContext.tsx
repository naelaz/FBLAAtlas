import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ConfettiLayer } from "../components/social/ConfettiLayer";
import { awardDailyLoginIfNeeded } from "../services/gamificationService";
import { sendLocalPush } from "../services/pushService";
import { PointAction, PointAwardResult } from "../types/social";
import { useAuthContext } from "./AuthContext";
import { useNotifications } from "./NotificationsContext";
import { usePushNotifications } from "./PushNotificationsContext";
import { useSettings } from "./SettingsContext";

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
      return `🎉 +${pointsAwarded} XP — You're going to ${options?.eventName ?? "that event"}!`;
    case "posting":
      return `✏️ +${pointsAwarded} XP — Nice post!`;
    case "commenting":
      return `💬 +${pointsAwarded} XP — Keep the convo going!`;
    case "likes_received":
      return `❤️ +${pointsAwarded} XP — Someone liked your post!`;
    case "daily_login":
      return `🔥 +${pointsAwarded} XP — Day ${streakCount ?? 1} streak!`;
    case "following_user":
      return `➕ +${pointsAwarded} XP — Growing your network!`;
    case "messaging_new":
      return `📨 +${pointsAwarded} XP — New conversation started!`;
    default:
      return `+${pointsAwarded} XP`;
  }
}

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthContext();
  const { notifications } = useNotifications();
  const { enabled: pushEnabled } = usePushNotifications();
  const { settings } = useSettings();

  const [queue, setQueue] = useState<XpToastState[]>([]);
  const [activeToast, setActiveToast] = useState<XpToastState | null>(null);
  const [tierUpgrade, setTierUpgrade] = useState<TierUpgradeState | null>(null);

  const toastTranslate = useSharedValue(110);
  const toastOpacity = useSharedValue(0);
  const processedNotificationIds = useRef<Set<string>>(new Set());
  const recentMessages = useRef<Map<string, number>>(new Map());

  const toastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastTranslate.value }],
    opacity: toastOpacity.value,
  }));

  const enqueueToast = useCallback((points: number, color: string, message: string) => {
    recentMessages.current.set(message, Date.now());
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

    toastTranslate.value = 110;
    toastOpacity.value = 0;

    toastTranslate.value = withTiming(0, { duration: 280 });
    toastOpacity.value = withTiming(1, { duration: 220 });

    const timer = setTimeout(() => {
      toastTranslate.value = withTiming(110, { duration: 260 });
      toastOpacity.value = withTiming(0, { duration: 220 });
      setTimeout(() => setActiveToast(null), 260);
    }, 2500);

    return () => clearTimeout(timer);
  }, [activeToast, toastOpacity, toastTranslate]);

  const handleAwardResult = useCallback(
    (result: PointAwardResult | null | undefined, options?: AwardMessageOptions) => {
      if (!result) {
        return;
      }

      if (result.pointsAwarded > 0) {
        const message = formatAwardMessage(
          result.action,
          result.pointsAwarded,
          options,
          result.streakCount,
        );

        enqueueToast(result.pointsAwarded, result.newTier.color, message);

        if (settings.notifications.xp && pushEnabled && settings.notifications.globalPush) {
          void sendLocalPush("XP Earned", message);
        }
      }

      if (result.tierUpgraded) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTierUpgrade({
          fromTier: result.previousTier.name,
          toTier: result.newTier.name,
        });

        if (pushEnabled && settings.notifications.globalPush && settings.notifications.xp) {
          void sendLocalPush(
            "Tier Upgrade",
            `🏆 You reached ${result.newTier.name}! Keep it up!`,
          );
        }
      }

      if (
        typeof result.streakCount === "number" &&
        result.streakCount > 1 &&
        pushEnabled &&
        settings.notifications.globalPush &&
        settings.notifications.streaks
      ) {
        void sendLocalPush("Daily Streak", `🔥 +15 XP — Day ${result.streakCount} streak!`);
      }
    },
    [enqueueToast, pushEnabled, settings.notifications.globalPush, settings.notifications.streaks, settings.notifications.xp],
  );

  useEffect(() => {
    if (!profile) {
      return;
    }

    let cancelled = false;

    const runDailyReward = async () => {
      try {
        const result = await awardDailyLoginIfNeeded(profile.uid);
        if (!cancelled) {
          handleAwardResult(result);
        }
      } catch (error) {
        console.warn("Daily login reward failed:", error);
      }
    };

    void runDailyReward();

    return () => {
      cancelled = true;
    };
  }, [profile?.uid, handleAwardResult]);

  useEffect(() => {
    const now = Date.now();
    for (const [text, timestamp] of recentMessages.current.entries()) {
      if (now - timestamp > 5000) {
        recentMessages.current.delete(text);
      }
    }

    notifications.forEach((item) => {
      if (processedNotificationIds.current.has(item.id)) {
        return;
      }
      processedNotificationIds.current.add(item.id);

      if (item.type !== "xp") {
        return;
      }

      if (!settings.notifications.xp) {
        return;
      }

      if (recentMessages.current.has(item.body)) {
        return;
      }

      const pointsMatch = item.body.match(/\+(\d+)\sXP/i);
      const points = pointsMatch ? Number(pointsMatch[1]) : 0;
      enqueueToast(points, "#3B82F6", item.body);

      if (pushEnabled && settings.notifications.globalPush) {
        void sendLocalPush("XP Earned", item.body);
      }
    });
  }, [notifications, enqueueToast, pushEnabled, settings.notifications.globalPush, settings.notifications.xp]);

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
              bottom: 88,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: activeToast.color,
              backgroundColor: "rgba(11,18,32,0.94)",
              paddingHorizontal: 14,
              paddingVertical: 12,
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            },
            toastStyle,
          ]}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "800", marginBottom: 2 }}>
            +{activeToast.points} XP
          </Text>
          <Text style={{ color: "#E2E8F0" }}>{activeToast.message}</Text>
        </Animated.View>
      ) : null}

      <Modal visible={tierUpgrade !== null} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.66)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 380,
              borderRadius: 22,
              padding: 20,
              gap: 12,
              overflow: "hidden",
              backgroundColor: "#FFFFFF",
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: "900", color: "#0F172A" }}>🏆 Tier Upgrade!</Text>
            <Text style={{ color: "#334155", fontSize: 15 }}>
              {tierUpgrade ? `You reached ${tierUpgrade.toTier}! Keep it up!` : ""}
            </Text>
            <Pressable
              onPress={() => setTierUpgrade(null)}
              style={{
                alignSelf: "flex-start",
                backgroundColor: "#2563EB",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 9,
              }}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>Awesome</Text>
            </Pressable>
            <ConfettiLayer active={tierUpgrade !== null} />
          </View>
        </View>
      </Modal>
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

