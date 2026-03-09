import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { NotificationBell } from "../components/NotificationBell";
import { FblaSocialSection } from "../components/social/FblaSocialSection";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassSurface } from "../components/ui/GlassSurface";
import { TierBadge } from "../components/ui/TierBadge";
import { useAuthContext } from "../context/AuthContext";
import { usePushNotifications } from "../context/PushNotificationsContext";
import { useSettings } from "../context/SettingsContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import { AnnouncementItem, fetchLatestAnnouncement } from "../services/chapterService";
import { fetchEventsOnce, fetchPostsOnce, fetchSchoolUsersOnce } from "../services/socialService";
import { formatRelativeDateTime } from "../services/firestoreUtils";
import { sendLocalPush } from "../services/pushService";
import { EventItem, PostItem, UserProfile } from "../types/social";
import { formatCompactNumber } from "../utils/format";

const QUICK_ACTIONS: Array<{ id: string; label: string; route: keyof RootStackParamList }> = [
  { id: "notifications", label: "Notifications", route: "Notifications" },
  { id: "conferences", label: "Conferences", route: "MyConferences" },
  { id: "leaderboard", label: "Leaderboard", route: "Leaderboard" },
  { id: "create_post", label: "New Post", route: "CreatePost" },
];
const DISMISSED_ANNOUNCEMENT_KEY = "fbla_atlas_dismissed_announcement_v1";
const LAST_PUSHED_ANNOUNCEMENT_KEY = "fbla_atlas_last_pushed_announcement_v1";

function dayGreeting(name: string): string {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${prefix}, ${name}`;
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, loading: authLoading } = useAuthContext();
  const { settings } = useSettings();
  const { enabled: pushEnabled } = usePushNotifications();
  const { palette } = useThemeContext();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [announcement, setAnnouncement] = useState<AnnouncementItem | null>(null);
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadDismissed = async () => {
      try {
        const stored = (await AsyncStorage.getItem(DISMISSED_ANNOUNCEMENT_KEY)) ?? "";
        if (mounted) {
          setDismissedAnnouncementId(stored);
        }
      } catch (error) {
        console.warn("Failed loading dismissed announcement state:", error);
      }
    };
    void loadDismissed();
    return () => {
      mounted = false;
    };
  }, []);

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
        const latestAnnouncement = await fetchLatestAnnouncement();
        if (!cancelled) {
          setAnnouncement(latestAnnouncement);
        }
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

  useEffect(() => {
    if (!announcement || !profile) {
      return;
    }
    if (!settings.notifications.globalPush || !settings.notifications.chapterUpdates || !pushEnabled) {
      return;
    }

    let cancelled = false;
    const notify = async () => {
      try {
        const storageKey = `${LAST_PUSHED_ANNOUNCEMENT_KEY}_${profile.uid}`;
        const lastPushedId = await AsyncStorage.getItem(storageKey);
        if (cancelled || lastPushedId === announcement.id) {
          return;
        }
        await sendLocalPush("Chapter Update", announcement.message);
        await AsyncStorage.setItem(storageKey, announcement.id);
      } catch (error) {
        console.warn("Chapter update push failed:", error);
      }
    };

    void notify();
    return () => {
      cancelled = true;
    };
  }, [
    announcement,
    profile,
    pushEnabled,
    settings.notifications.chapterUpdates,
    settings.notifications.globalPush,
  ]);

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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        {announcement && announcement.id !== dismissedAnnouncementId ? (
          <GlassSurface
            style={{
              padding: 12,
              marginBottom: 12,
              backgroundColor: palette.colors.surface,
              borderRadius: 16,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: palette.colors.textMuted,
                    fontSize: 12,
                    fontWeight: "600",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                  }}
                >
                  Announcement
                </Text>
                <Text style={{ color: palette.colors.text, marginTop: 4, fontSize: 14 }}>
                  {announcement.message}
                </Text>
                <Text style={{ color: palette.colors.textMuted, marginTop: 4, fontSize: 12 }}>
                  Posted by {announcement.createdBy}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setDismissedAnnouncementId(announcement.id);
                  void AsyncStorage.setItem(DISMISSED_ANNOUNCEMENT_KEY, announcement.id);
                }}
                style={{ minWidth: 32, minHeight: 32, alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} color={palette.colors.textMuted} />
              </Pressable>
            </View>
          </GlassSurface>
        ) : null}

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: palette.colors.textMuted,
                fontSize: 13,
                fontWeight: "600",
                marginBottom: 2,
                letterSpacing: 0.8,
                textTransform: "uppercase",
              }}
            >
              Home
            </Text>
            <Text style={{ color: palette.colors.text, fontWeight: "700", fontSize: 22 }}>
              {dayGreeting(profile.displayName.split(" ")[0])}
            </Text>
            <Text style={{ color: palette.colors.textMuted, marginTop: 4, fontSize: 14 }}>
              FBLA updates and chapter activity
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <NotificationBell />
            <AvatarWithStatus
              uri={profile.avatarUrl}
              seed={profile.displayName}
              size={38}
              online={false}
              tier={profile.tier}
            />
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
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
                    backgroundColor: palette.colors.surface,
                    borderRadius: 16,
                  }}
                >
                  <Text style={{ color: palette.colors.text, fontWeight: "600", fontSize: 14 }}>
                    {action.label}
                  </Text>
                </GlassSurface>
              )}
            </Pressable>
          ))}
        </View>

        {settings.customize.showStoriesBar ? <FblaSocialSection /> : null}

        {settings.customize.showCampusPulse ? (
          <>
            <GlassSurface
              style={{ padding: 16, marginBottom: 12, backgroundColor: palette.colors.surface, borderRadius: 16 }}
            >
              <Text
                style={{
                  color: palette.colors.textMuted,
                  fontWeight: "600",
                  marginTop: 20,
                  marginBottom: 10,
                  letterSpacing: 0.8,
                  fontSize: 13,
                  textTransform: "uppercase",
                }}
              >
                Upcoming Events
              </Text>
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
                    <Text style={{ color: palette.colors.text, fontWeight: "600", fontSize: 16 }} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text style={{ color: palette.colors.textMuted, fontSize: 12 }}>
                      {new Date(event.startAt).toLocaleString()}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={{ color: palette.colors.textMuted, fontSize: 14 }}>No events yet.</Text>
              )}
            </GlassSurface>

            <GlassSurface
              style={{ padding: 16, marginBottom: 12, backgroundColor: palette.colors.surface, borderRadius: 16 }}
            >
              <Text
                style={{
                  color: palette.colors.textMuted,
                  fontWeight: "600",
                  marginTop: 20,
                  marginBottom: 10,
                  letterSpacing: 0.8,
                  fontSize: 13,
                  textTransform: "uppercase",
                }}
              >
                Chapter Snapshot
              </Text>
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
                      <AvatarWithStatus uri={member.avatarUrl} size={32} online tier={member.tier} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: palette.colors.text, fontWeight: "600", fontSize: 14 }} numberOfLines={1}>
                          {member.displayName}
                        </Text>
                        <TierBadge tier={member.tier} />
                      </View>
                    </View>
                    <Text style={{ color: palette.colors.text, fontWeight: "600", fontSize: 14 }}>
                      {formatCompactNumber(member.xp)} XP
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: palette.colors.textMuted, fontSize: 14 }}>Nothing here yet.</Text>
              )}
            </GlassSurface>
          </>
        ) : null}

        {settings.customize.showSocialFeed ? (
          <GlassSurface style={{ padding: 16, backgroundColor: palette.colors.surface, borderRadius: 16 }}>
            <Text
              style={{
                color: palette.colors.textMuted,
                fontWeight: "600",
                marginTop: 20,
                marginBottom: 10,
                letterSpacing: 0.8,
                fontSize: 13,
                textTransform: "uppercase",
              }}
            >
              Latest Feed
            </Text>
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
                    <Text style={{ color: palette.colors.text, fontWeight: "600", fontSize: 14 }}>{post.authorName}</Text>
                    <Text style={{ color: palette.colors.textMuted, fontSize: 12 }}>
                      {formatRelativeDateTime(post.createdAt)}
                    </Text>
                  </View>
                  <Text style={{ color: palette.colors.text, fontSize: 14 }}>{post.content}</Text>
                </View>
              ))
            )}
          </GlassSurface>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
