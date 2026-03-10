import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "react-native-paper";

import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { Badge } from "../components/ui/badge";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSurface } from "../components/ui/GlassSurface";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { TierBadge } from "../components/ui/TierBadge";
import { useAuthContext } from "../context/AuthContext";
import { useMessaging } from "../context/MessagingContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import { hapticTap } from "../services/haptics";
import {
  createOrGetConversation,
  findStudentsByName,
  getConversationUnreadCount,
} from "../services/messagingService";
import { fetchSchoolUsersOnce } from "../services/socialService";
import { UserProfile } from "../types/social";
import { ScreenShell } from "../components/ScreenShell";
import { formatRelativeTime } from "../utils/format";

export function MessagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuthContext();
  const { conversations, unreadCount, refreshing, refreshConversations } = useMessaging();
  const { palette } = useThemeContext();

  const [usersById, setUsersById] = useState<Map<string, UserProfile>>(new Map());
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  useEffect(() => {
    if (!profile) {
      return;
    }
    const loadUsers = async () => {
      try {
        const users = await fetchSchoolUsersOnce(profile.schoolId);
        setUsersById(new Map(users.map((user) => [user.uid, user])));
      } catch (error) {
        console.warn("Messages users load failed:", error);
      }
    };
    void loadUsers();
  }, [profile?.schoolId]);

  useEffect(() => {
    if (!profile) {
      return;
    }
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoadingSearch(true);
      void findStudentsByName(profile.schoolId, profile.uid, query)
        .then((rows) => {
          if (!cancelled) {
            setResults(rows);
          }
        })
        .catch((error) => {
          console.warn("Search students failed:", error);
        })
        .finally(() => {
          if (!cancelled) {
            setLoadingSearch(false);
          }
        });
    }, 240);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, profile?.uid, profile?.schoolId]);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [conversations]);

  if (!profile) {
    return (
      <ScreenShell title="Messages" subtitle="Loading messages..." showBackButton={false}>
        <Text>Loading...</Text>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Messages"
      subtitle={`Unread: ${unreadCount} • Real-time conversations`}
      refreshing={refreshing}
      onRefresh={() => void refreshConversations()}
      showBackButton={false}
    >
      <GlassSurface strong elevation={3} style={{ marginBottom: 12, backgroundColor: palette.colors.surface, padding: 12 }}>
        <View style={{ gap: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800" }}>
            Start New Conversation
          </Text>
          <GlassInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search a student by name"
            leftSlot={<Search size={16} color={palette.colors.textSecondary} />}
          />

          {loadingSearch ? (
            <SkeletonCard height={62} />
          ) : (
            <View style={{ gap: 8 }}>
              {results.slice(0, 4).map((user) => (
                <Pressable
                  key={user.uid}
                  onPress={async () => {
                    hapticTap();
                    try {
                      const conversation = await createOrGetConversation(profile, user);
                      navigation.navigate("Chat", {
                        conversationId: conversation.conversationId,
                        targetUserId: user.uid,
                      });
                      setQuery("");
                      setResults([]);
                    } catch (error) {
                      console.warn("Create conversation failed:", error);
                    }
                  }}
                  style={{ minHeight: 60 }}
                >
                  {({ pressed }) => (
                    <GlassSurface
                      pressed={pressed}
                      elevation={2}
                      borderRadius={12}
                      style={{
                        borderWidth: 1,
                        borderColor: palette.colors.border,
                        borderRadius: 12,
                        padding: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <AvatarWithStatus uri={user.avatarUrl} size={36} online={false} tier={user.tier} />
                        <View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={{ fontWeight: "700" }}>{user.displayName}</Text>
                            <TierBadge tier={user.tier} />
                          </View>
                          <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>
                            {user.grade}th grade
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: palette.colors.primary, fontWeight: "700" }}>Chat</Text>
                    </GlassSurface>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </GlassSurface>

      <GlassSurface strong elevation={3} style={{ backgroundColor: palette.colors.surface, padding: 12 }}>
        <View style={{ gap: 10 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800" }}>
            Conversations
          </Text>
          {sortedConversations.map((conversation) => {
            const otherId = conversation.participants.find((id) => id !== profile.uid);
            const other = otherId ? usersById.get(otherId) : null;
            const unread = getConversationUnreadCount(conversation, profile.uid);
            const typing = otherId ? Boolean(conversation.typingBy?.[otherId]) : false;

            return (
              <Pressable
                key={conversation.id}
                onPress={() => {
                  hapticTap();
                  navigation.navigate("Chat", { conversationId: conversation.id, targetUserId: otherId });
                }}
                style={{ minHeight: 68 }}
              >
                {({ pressed }) => (
                  <GlassSurface
                    pressed={pressed}
                    elevation={2}
                    borderRadius={14}
                    style={{
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: palette.colors.border,
                      padding: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View>
                      <AvatarWithStatus
                        uri={other?.avatarUrl ?? ""}
                        size={42}
                        online={false}
                        tier={other?.tier}
                      />
                      {unread > 0 ? (
                        <Badge
                          variant="blue"
                          style={{ position: "absolute", right: -4, top: -2 }}
                          capitalize={false}
                        >
                          {unread}
                        </Badge>
                      ) : null}
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                          <Text style={{ fontWeight: "800", color: palette.colors.text }} numberOfLines={1}>
                            {other?.displayName ?? "Conversation"}
                          </Text>
                          {other ? <TierBadge tier={other.tier} /> : null}
                        </View>
                        <Text style={{ color: palette.colors.muted, fontSize: 12 }}>
                          {formatRelativeTime(conversation.updatedAt)}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: typing ? palette.colors.success : palette.colors.textSecondary,
                          marginTop: 2,
                        }}
                      >
                        {typing ? "Typing..." : conversation.lastMessage || "No messages yet"}
                      </Text>
                    </View>
                  </GlassSurface>
                )}
              </Pressable>
            );
          })}

          {sortedConversations.length === 0 ? (
            <EmptyState
              title="No Conversations Yet"
              message="Start a chat by searching for a student above."
            />
          ) : null}
        </View>
      </GlassSurface>
    </ScreenShell>
  );
}

