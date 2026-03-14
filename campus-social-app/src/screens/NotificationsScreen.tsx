import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Bell,
  Flame,
  Heart,
  MessageCircle,
  Sparkles,
  Star,
  Trophy,
  UserPlus,
  Zap,
} from "lucide-react-native";
import React, { useLayoutEffect, useMemo } from "react";
import { Pressable, View } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassSurface } from "../components/ui/GlassSurface";
import { useNotifications } from "../context/NotificationsContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import { hapticTap } from "../services/haptics";
import { AppNotification, AppNotificationType } from "../types/social";
import { formatRelativeTime } from "../utils/format";

type SectionTitle = "Today" | "This Week" | "Earlier";
type NotificationRow =
  | { type: "header"; key: string; title: SectionTitle }
  | { type: "item"; key: string; item: AppNotification };

function getSectionTitle(createdAt: string): SectionTitle {
  const date = new Date(createdAt).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - date);
  const dayMs = 24 * 60 * 60 * 1000;

  if (diff < dayMs) {
    return "Today";
  }
  if (diff < dayMs * 7) {
    return "This Week";
  }
  return "Earlier";
}

const NOTIFICATION_ICON_CONFIG: Record<AppNotificationType, { icon: typeof Bell; color: string }> = {
  like: { icon: Heart, color: "#EC4899" },
  comment: { icon: MessageCircle, color: "#3B82F6" },
  follow: { icon: UserPlus, color: "#8B5CF6" },
  event_reminder: { icon: Bell, color: "#F97316" },
  message: { icon: MessageCircle, color: "#06B6D4" },
  tier_upgrade: { icon: Trophy, color: "#EAB308" },
  reaction: { icon: Sparkles, color: "#A855F7" },
  xp: { icon: Zap, color: "#22C55E" },
  streak: { icon: Flame, color: "#F43F5E" },
};

function NotificationIcon({ type, size }: { type: AppNotificationType; size: number }) {
  const config = NOTIFICATION_ICON_CONFIG[type] ?? NOTIFICATION_ICON_CONFIG.event_reminder;
  const Icon = config.icon;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: config.color + "18",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={size * 0.48} color={config.color} />
    </View>
  );
}

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { palette } = useThemeContext();
  const { notifications, unreadCount, refreshing, refreshNotifications, markAllRead, markRead, dismiss, dismissAll } =
    useNotifications();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <GlassButton
            variant="pill-sm"
            label="Mark read"
            fullWidth={false}
            onPress={() => {
              hapticTap();
              void markAllRead();
            }}
          />
          <GlassButton
            variant="pill-sm"
            label="Clear all"
            fullWidth={false}
            onPress={() => {
              hapticTap();
              void dismissAll();
            }}
          />
        </View>
      ),
    });
  }, [markAllRead, dismissAll, navigation]);

  const rows = useMemo<NotificationRow[]>(() => {
    const grouped: Record<SectionTitle, AppNotification[]> = {
      Today: [],
      "This Week": [],
      Earlier: [],
    };

    notifications.forEach((item) => {
      grouped[getSectionTitle(item.createdAt)].push(item);
    });

    const flattened: NotificationRow[] = [];
    (["Today", "This Week", "Earlier"] as const).forEach((section) => {
      const items = grouped[section];
      if (items.length === 0) {
        return;
      }
      flattened.push({ type: "header", key: `header_${section}`, title: section });
      items.forEach((item) => {
        flattened.push({ type: "item", key: item.id, item });
      });
    });
    return flattened;
  }, [notifications]);

  return (
    <ScreenShell
      title="Notifications"
      subtitle={`Unread: ${unreadCount}`}
      refreshing={refreshing}
      onRefresh={() => void refreshNotifications()}
    >
      {rows.length === 0 ? (
        <EmptyState title="You're all caught up" message="New likes, comments, and reminders will appear here." />
      ) : (
        <View style={{ gap: 8 }}>
          {rows.map((row, index) => {
            if (row.type === "header") {
              return (
                <Text
                  key={row.key}
                  style={{
                    color: palette.colors.textMuted,
                    fontWeight: "700",
                    marginTop: index === 0 ? 0 : 8,
                    fontSize: 11,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {row.title}
                </Text>
              );
            }

            const item = row.item;
            const rightAction = () => (
              <Pressable
                onPress={() => {
                  hapticTap();
                  void dismiss(item.id);
                }}
                style={{
                  width: 92,
                  borderRadius: 14,
                  backgroundColor: palette.colors.danger,
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 8,
                }}
              >
                <Text style={{ color: palette.colors.onDanger, fontWeight: "800" }}>Dismiss</Text>
              </Pressable>
            );

            return (
              <View key={row.key}>
                <Swipeable renderRightActions={rightAction}>
                  <Pressable
                    onPress={() => {
                      hapticTap();
                      if (!item.read) {
                        void markRead(item.id);
                      }
                    }}
                  >
                    <GlassSurface
                      style={{
                        padding: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        backgroundColor: item.read ? palette.colors.glass : palette.colors.surface,
                        borderColor: item.read ? palette.colors.glassBorder : palette.colors.primary,
                      }}
                    >
                      <NotificationIcon type={item.type} size={42} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: palette.colors.text, fontWeight: "800" }}>{item.title}</Text>
                        <Text style={{ color: palette.colors.muted, marginTop: 2 }}>{item.body}</Text>
                        <Text style={{ color: palette.colors.muted, marginTop: 3, fontSize: 12 }}>
                          {formatRelativeTime(item.createdAt)}
                        </Text>
                      </View>
                      {!item.read ? (
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: palette.colors.primary,
                          }}
                        />
                      ) : null}
                    </GlassSurface>
                  </Pressable>
                </Swipeable>
              </View>
            );
          })}
        </View>
      )}
    </ScreenShell>
  );
}
