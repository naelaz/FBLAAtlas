import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useLayoutEffect, useMemo } from "react";
import { Pressable, View } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassSurface } from "../components/ui/GlassSurface";
import { getUserAvatarUrl } from "../constants/media";
import { useNotifications } from "../context/NotificationsContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import { hapticTap } from "../services/haptics";
import { AppNotification } from "../types/social";
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

function avatarForNotification(item: AppNotification): string {
  const fromMetadata = item.metadata?.avatarUrl;
  if (fromMetadata) {
    return fromMetadata;
  }
  const seedSource = item.metadata?.userId ?? item.id;
  return getUserAvatarUrl(seedSource);
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
                      <AvatarWithStatus uri={avatarForNotification(item)} size={42} online={!item.read} />
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
