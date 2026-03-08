import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { ActivityIndicator, Avatar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { NotificationBell } from "../components/NotificationBell";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassSurface } from "../components/ui/GlassSurface";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import { fetchEventsOnce, fetchPostsOnce, fetchSchoolUsersOnce } from "../services/socialService";
import { formatRelativeDateTime } from "../services/firestoreUtils";
import { EventItem, PostItem, UserProfile } from "../types/social";
import { formatCompactNumber } from "../utils/format";

const QUICK_ACTIONS: Array<{ id: string; label: string; route: keyof RootStackParamList }> = [
  { id: "notifications", label: "Notifications", route: "Notifications" },
  { id: "conferences", label: "Conferences", route: "MyConferences" },
  { id: "leaderboard", label: "Leaderboard", route: "Leaderboard" },
  { id: "create_post", label: "New Post", route: "CreatePost" },
];

function dayGreeting(name: string): string {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${prefix}, ${name}`;
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, loading: authLoading } = useAuthContext();
  const { palette } = useThemeContext();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [schoolUsers, schoolPosts, schoolEvents] = await Promise.all([
          fetchSchoolUsersOnce(profile.schoolId),
          fetchPostsOnce(profile.schoolId),
          fetchEventsOnce(profile.schoolId),
        ]);
        if (cancelled) {
          return;
        }
        setUsers(schoolUsers);
        setPosts(schoolPosts.slice(0, 6));
        setEvents(
          [...schoolEvents].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
        );
      } catch (error) {
        if (!cancelled) {
          console.warn("Home feed load failed:", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [profile?.schoolId, profile?.uid]);

  const topMembers = useMemo(
    () => [...users].sort((a, b) => b.xp - a.xp).slice(0, 3),
    [users],
  );
  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events
      .filter((event) => new Date(event.startAt).getTime() >= now)
      .slice(0, 3);
  }, [events]);

  if (authLoading || !profile) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.colors.background }}>
        <ActivityIndicator animating size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.colors.textSecondary, fontSize: 12, fontWeight: "700", marginBottom: 2 }}>
              Home
            </Text>
            <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 32 }}>
              {dayGreeting(profile.displayName.split(" ")[0])}
            </Text>
            <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
              FBLA updates and chapter activity
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <NotificationBell />
            <AvatarWithStatus uri={profile.avatarUrl} seed={profile.displayName} size={38} online={false} />
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              onPress={() => {
                navigation.navigate(action.route as never);
              }}
              style={{ width: "48%", minHeight: 40 }}
            >
              {({ pressed }) => (
                <GlassSurface
                  pressed={pressed}
                  style={{
                    flex: 1,
                    minHeight: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: palette.colors.inputSurface,
                  }}
                >
                  <Text style={{ color: palette.colors.text, fontWeight: "700", fontSize: 12 }}>
                    {action.label}
                  </Text>
                </GlassSurface>
              )}
            </Pressable>
          ))}
        </View>

        <GlassSurface style={{ padding: 12, marginBottom: 12, backgroundColor: palette.colors.surface }}>
          <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>Upcoming Events</Text>
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event, index) => (
              <Pressable
                key={event.id}
                onPress={() => navigation.navigate("EventDetail", { eventId: event.id })}
                style={{
                  paddingVertical: 8,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: palette.colors.divider,
                }}
              >
                <Text style={{ color: palette.colors.text, fontWeight: "700" }} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>
                  {new Date(event.startAt).toLocaleString()}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={{ color: palette.colors.textSecondary }}>No upcoming events yet.</Text>
          )}
        </GlassSurface>

        <GlassSurface style={{ padding: 12, marginBottom: 12, backgroundColor: palette.colors.surface }}>
          <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>Chapter Snapshot</Text>
          {topMembers.length > 0 ? (
            topMembers.map((member, index) => (
              <View
                key={member.uid}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: palette.colors.divider,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <Avatar.Text size={32} label={member.displayName.slice(0, 2).toUpperCase()} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.colors.text, fontWeight: "700" }} numberOfLines={1}>
                      {member.displayName}
                    </Text>
                    <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>{member.tier}</Text>
                  </View>
                </View>
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{formatCompactNumber(member.xp)} XP</Text>
              </View>
            ))
          ) : (
            <Text style={{ color: palette.colors.textSecondary }}>No members available yet.</Text>
          )}
        </GlassSurface>

        <GlassSurface style={{ padding: 12, backgroundColor: palette.colors.surface }}>
          <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>Latest Feed</Text>
          {loading ? (
            <ActivityIndicator animating size="small" />
          ) : posts.length === 0 ? (
            <EmptyState title="No Posts Yet" message="Your chapter feed is empty right now." />
          ) : (
            posts.map((post, index) => (
              <View
                key={post.id}
                style={{
                  paddingVertical: 10,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: palette.colors.divider,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{post.authorName}</Text>
                  <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>
                    {formatRelativeDateTime(post.createdAt)}
                  </Text>
                </View>
                <Text style={{ color: palette.colors.textSecondary }}>{post.content}</Text>
              </View>
            ))
          )}
        </GlassSurface>
      </ScrollView>
    </SafeAreaView>
  );
}
