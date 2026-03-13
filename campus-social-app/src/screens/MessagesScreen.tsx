import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MessageCircle, Search, UserCheck, UserPlus } from "lucide-react-native";
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
import { fetchSchoolUsersOnce, toggleFollowUser } from "../services/socialService";
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
  const [showFindStudents, setShowFindStudents] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [findStudentsQuery, setFindStudentsQuery] = useState("");
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

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
    if (!profile || !showFindStudents) return;
    void fetchSchoolUsersOnce(profile.schoolId).then((rows) => {
      setAllUsers(rows.filter((u) => u.uid !== profile.uid));
      setFollowingIds(new Set(profile.followingIds ?? []));
    }).catch(() => undefined);
  }, [showFindStudents, profile?.schoolId]);

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

      <Pressable
        onPress={() => { hapticTap(); setShowFindStudents((v) => !v); }}
        style={{ marginBottom: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Find Students"
      >
        {({ pressed }) => (
          <GlassSurface
            pressed={pressed}
            elevation={2}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: palette.colors.primary,
            }}
          >
            <UserPlus size={18} color={palette.colors.primary} />
            <Text style={{ color: palette.colors.primary, fontWeight: "700", fontSize: 14 }}>
              {showFindStudents ? "Close Student List" : "Add Friend / Find Students"}
            </Text>
          </GlassSurface>
        )}
      </Pressable>

      {showFindStudents ? (
        <GlassSurface strong elevation={3} style={{ backgroundColor: palette.colors.surface, padding: 12, marginBottom: 12, gap: 10 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800" }}>
            Students in Your Chapter
          </Text>
          <GlassInput
            value={findStudentsQuery}
            onChangeText={setFindStudentsQuery}
            placeholder="Search by name..."
            leftSlot={<Search size={15} color={palette.colors.textSecondary} />}
          />
          {allUsers.length === 0 ? (
            <Text style={{ color: palette.colors.textSecondary, fontSize: 13 }}>Loading students...</Text>
          ) : (
            allUsers.filter((u) =>
              !findStudentsQuery.trim() ||
              u.displayName.toLowerCase().includes(findStudentsQuery.trim().toLowerCase())
            ).map((user) => {
              const isFollowing = followingIds.has(user.uid);
              return (
                <GlassSurface
                  key={user.uid}
                  elevation={2}
                  borderRadius={12}
                  style={{
                    borderWidth: 1,
                    borderColor: palette.colors.border,
                    borderRadius: 12,
                    padding: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AvatarWithStatus
                    uri={user.avatarUrl}
                    seed={user.displayName}
                    size={40}
                    online={false}
                    tier={user.tier}
                    avatarColor={user.avatarColor || undefined}
                    onPress={() => navigation.navigate("StudentProfile", { userId: user.uid })}
                  />
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => navigation.navigate("StudentProfile", { userId: user.uid })}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontWeight: "700", color: palette.colors.text }} numberOfLines={1}>
                        {user.displayName}
                      </Text>
                      <TierBadge tier={user.tier} />
                    </View>
                    <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>
                      {user.primaryEvent ?? "FBLA Member"}
                    </Text>
                  </Pressable>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <Pressable
                      onPress={async () => {
                        hapticTap();
                        setFollowingIds((prev) => {
                          const next = new Set(prev);
                          if (isFollowing) next.delete(user.uid); else next.add(user.uid);
                          return next;
                        });
                        try { await toggleFollowUser(profile, user); } catch { /* revert */ }
                      }}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: isFollowing ? palette.colors.border : palette.colors.primary,
                        backgroundColor: isFollowing ? palette.colors.inputSurface : palette.colors.primary,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      {isFollowing
                        ? <UserCheck size={12} color={palette.colors.textSecondary} />
                        : <UserPlus size={12} color="#fff" />}
                      <Text style={{ color: isFollowing ? palette.colors.textSecondary : "#fff", fontSize: 11, fontWeight: "700" }}>
                        {isFollowing ? "Following" : "Follow"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        hapticTap();
                        try {
                          const conversation = await createOrGetConversation(profile, user);
                          setShowFindStudents(false);
                          navigation.navigate("Chat", { conversationId: conversation.conversationId, targetUserId: user.uid });
                        } catch (error) {
                          console.warn("Create conversation failed:", error);
                        }
                      }}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: palette.colors.border,
                        backgroundColor: palette.colors.inputSurface,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <MessageCircle size={12} color={palette.colors.text} />
                      <Text style={{ color: palette.colors.text, fontSize: 11, fontWeight: "700" }}>Message</Text>
                    </Pressable>
                  </View>
                </GlassSurface>
              );
            })
          )}
        </GlassSurface>
      ) : null}

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
                style={{ minHeight: 82 }}
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
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View>
                      <AvatarWithStatus
                        uri={other?.avatarUrl ?? ""}
                        seed={other?.displayName}
                        size={42}
                        online={false}
                        tier={other?.tier}
                        avatarColor={other?.avatarColor || undefined}
                        onPress={otherId ? () => navigation.navigate("StudentProfile", { userId: otherId }) : undefined}
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

