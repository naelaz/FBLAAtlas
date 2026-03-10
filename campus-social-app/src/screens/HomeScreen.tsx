import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { NotificationBell } from "../components/NotificationBell";
import { FblaSocialSection } from "../components/social/FblaSocialSection";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassIconButton } from "../components/ui/GlassIconButton";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { GlassSurface } from "../components/ui/GlassSurface";
import { useAccessibility } from "../context/AccessibilityContext";
import { useAuthContext } from "../context/AuthContext";
import { usePushNotifications } from "../context/PushNotificationsContext";
import { useSettings } from "../context/SettingsContext";
import { useThemeContext } from "../context/ThemeContext";
import { useNavBarScroll } from "../hooks/useNavBarScroll";
import { usePermissions } from "../hooks/usePermissions";
import { RootStackParamList } from "../navigation/types";
import { AnnouncementItem, fetchLatestAnnouncement, fetchMeetingNotes } from "../services/chapterService";
import { respondToChallenge, subscribeIncomingChallenges } from "../services/challengeService";
import { createChapterGoal, submitGoalContribution, subscribeChapterGoals } from "../services/goalsService";
import { subscribeOfficerTasks } from "../services/officerTaskService";
import { subscribeRecognitionPlacements } from "../services/recognitionService";
import { fetchEventsOnce, fetchPostsOnce } from "../services/socialService";
import { joinStudySession, subscribeStudySessions } from "../services/studySessionService";
import { formatRelativeDateTime } from "../services/firestoreUtils";
import { hapticTap } from "../services/haptics";
import { sendLocalPush } from "../services/pushService";
import { EventItem, PostItem } from "../types/social";
import { ChapterGoal, MeetingActionItem, OfficerTask, PracticeChallenge, RecognitionPlacement, StudySession } from "../types/features";

const QUICK_ACTIONS: Array<{ id: string; label: string; route: keyof RootStackParamList }> = [
  { id: "find_members", label: "Find Members", route: "Search" },
  { id: "conferences", label: "Conferences", route: "MyConferences" },
  { id: "leaderboard", label: "Leaderboard", route: "Leaderboard" },
  { id: "create_post", label: "New Post", route: "CreatePost" },
];
const DISMISSED_ANNOUNCEMENT_KEY = "fbla_atlas_dismissed_announcement_v1";
const LAST_PUSHED_ANNOUNCEMENT_KEY = "fbla_atlas_last_pushed_announcement_v1";
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function dayGreeting(name: string): string {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${prefix}, ${name}`;
}

function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeekMonday(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function shortMonthDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function categoryPill(themeCategory: EventItem["category"], accent: string) {
  const category = themeCategory ?? "FBLA";
  switch (category) {
    case "Sports":
      return { label: "Sports", color: "#22c55e" };
    case "Academic":
      return { label: "Academic", color: "#3b82f6" };
    case "Social":
      return { label: "Social", color: "#ec4899" };
    case "Arts":
      return { label: "Arts", color: "#a855f7" };
    case "FBLA":
    default:
      return { label: category, color: accent };
  }
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, loading: authLoading } = useAuthContext();
  const { settings, updateSettings } = useSettings();
  const { focusMode, setFocusMode } = useAccessibility();
  const { enabled: pushEnabled } = usePushNotifications();
  const { palette } = useThemeContext();
  const { onScroll, onScrollBeginDrag, scrollEventThrottle } = useNavBarScroll();
  const permissions = usePermissions();
  const canManageTasks = permissions.canManageTasks();

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [announcement, setAnnouncement] = useState<AnnouncementItem | null>(null);
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState("");
  const [incomingChallenges, setIncomingChallenges] = useState<PracticeChallenge[]>([]);
  const [recognitionRows, setRecognitionRows] = useState<RecognitionPlacement[]>([]);
  const [chapterGoals, setChapterGoals] = useState<ChapterGoal[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [officerTasks, setOfficerTasks] = useState<OfficerTask[]>([]);
  const [assignedActions, setAssignedActions] = useState<Array<MeetingActionItem & { meetingDate: string }>>([]);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("10");

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
        const [schoolPosts, schoolEvents] = await Promise.all([
          fetchPostsOnce(profile.schoolId),
          fetchEventsOnce(profile.schoolId),
        ]);
        if (cancelled) {
          return;
        }
        setPosts(schoolPosts.slice(0, 6));
        setEvents(
          [...schoolEvents].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
        );

        const latestAnnouncement = await fetchLatestAnnouncement();
        if (!cancelled) {
          setAnnouncement(latestAnnouncement);
        }
        if (profile.chapterId) {
          const meetingNotes = await fetchMeetingNotes(profile.chapterId);
          if (!cancelled) {
            const reminders = meetingNotes
              .flatMap((note) =>
                note.actionItems.map((item) => ({
                  ...item,
                  meetingDate: note.meetingDate,
                })),
              )
              .filter((item) => item.assigneeUid === profile.uid && !item.done)
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .slice(0, 5);
            setAssignedActions(reminders);
          }
        } else if (!cancelled) {
          setAssignedActions([]);
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
    if (!profile?.uid) {
      setIncomingChallenges([]);
      return;
    }
    const unsubscribe = subscribeIncomingChallenges(profile.uid, setIncomingChallenges);
    return unsubscribe;
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.schoolId) {
      setRecognitionRows([]);
      return;
    }
    const unsubscribe = subscribeRecognitionPlacements(profile.schoolId, setRecognitionRows);
    return unsubscribe;
  }, [profile?.schoolId]);

  useEffect(() => {
    if (!profile?.chapterId) {
      setChapterGoals([]);
      return;
    }
    const unsubscribe = subscribeChapterGoals(profile.chapterId, setChapterGoals);
    return unsubscribe;
  }, [profile?.chapterId]);

  useEffect(() => {
    if (!profile?.schoolId) {
      setStudySessions([]);
      return;
    }
    const unsubscribe = subscribeStudySessions(profile.schoolId, setStudySessions);
    return unsubscribe;
  }, [profile?.schoolId]);

  useEffect(() => {
    if (!profile?.chapterId || !canManageTasks) {
      setOfficerTasks((prev) => (prev.length > 0 ? [] : prev));
      return;
    }
    const unsubscribe = subscribeOfficerTasks(profile.chapterId, setOfficerTasks);
    return unsubscribe;
  }, [canManageTasks, profile?.chapterId]);

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

  const visibleQuickActions = useMemo(
    () =>
      focusMode
        ? [
            { id: "practice", label: "Practice", route: "Practice" as keyof RootStackParamList },
            { id: "events", label: "Events", route: "Events" as keyof RootStackParamList },
            { id: "finn", label: "Finn", route: "Finn" as keyof RootStackParamList },
          ]
        : QUICK_ACTIONS,
    [focusMode],
  );
  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events
      .filter((event) => new Date(event.startAt).getTime() >= now)
      .slice(0, 3);
  }, [events]);
  const weekDays = useMemo(() => {
    const start = startOfWeekMonday(new Date());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, []);
  const thisWeekEventKeys = useMemo(() => {
    const start = weekDays[0];
    const end = new Date(weekDays[6]);
    end.setHours(23, 59, 59, 999);
    return new Set(
      events
        .filter((event) => {
          const eventTime = new Date(event.startAt).getTime();
          return eventTime >= start.getTime() && eventTime <= end.getTime();
        })
        .map((event) => toDayKey(new Date(event.startAt))),
    );
  }, [events, weekDays]);

  if (authLoading || !profile) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 24, backgroundColor: palette.colors.background }}>
        <SkeletonCard height={140} />
        <SkeletonCard height={140} />
        <SkeletonCard height={140} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }}>
      <LinearGradient
        pointerEvents="none"
        colors={
          palette.isDark
            ? [palette.colors.background, palette.colors.surfaceAlt]
            : [palette.colors.background, palette.colors.surface]
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={scrollEventThrottle}
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBeginDrag}
      >
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

        {focusMode ? (
          <GlassSurface
            style={{
              padding: 10,
              marginBottom: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: palette.colors.border,
              backgroundColor: palette.colors.surfaceAlt,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Text style={{ color: palette.colors.textSecondary, flex: 1 }}>Focus Mode is on</Text>
            <Pressable
              onPress={() => {
                setFocusMode(false);
                void updateSettings((prev) => ({
                  ...prev,
                  accessibility: { ...prev.accessibility, focusMode: false },
                }));
              }}
              style={{ minHeight: 36, justifyContent: "center", paddingHorizontal: 8 }}
            >
              <Text style={{ color: palette.colors.primary, fontWeight: "700" }}>Disable</Text>
            </Pressable>
          </GlassSurface>
        ) : null}

        <View
          style={{
            position: "relative",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            borderRadius: 16,
            overflow: "hidden",
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[palette.colors.surface, palette.colors.transparent]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ position: "absolute", left: 0, right: 0, top: 0, height: 80 }}
          />
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
            {profile.avatarUrl ? (
              <AvatarWithStatus
                uri={profile.avatarUrl}
                seed={profile.displayName}
                size={32}
                online={false}
                tier={profile.tier}
                onPress={() => {
                  hapticTap();
                  navigation.navigate("Profile", { openEdit: true });
                }}
              />
            ) : (
              <GlassIconButton
                accessibilityLabel="Open Edit Profile"
                size={38}
                onPress={() => {
                  hapticTap();
                  navigation.navigate("Profile", { openEdit: true });
                }}
              >
                <Feather name="user" size={24} color={palette.colors.text} />
              </GlassIconButton>
            )}
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          {visibleQuickActions.map((action) => (
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

        <Pressable
          onPress={() => navigation.navigate("Events")}
          style={{ marginBottom: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Open full events page"
        >
          {({ pressed }) => (
            <GlassSurface
              pressed={pressed}
              style={{
                padding: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: palette.colors.border,
                backgroundColor: palette.colors.surface,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: palette.colors.text, fontWeight: "700", fontSize: 15 }}>
                  Events
                </Text>
                <Text style={{ color: palette.colors.primary, fontWeight: "700", fontSize: 12 }}>
                  See All →
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: palette.colors.textMuted, fontSize: 12, marginBottom: 6 }}>
                    {new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    {WEEKDAY_LABELS.map((label) => (
                      <Text key={label} style={{ width: `${100 / 7}%`, textAlign: "center", color: palette.colors.textMuted, fontSize: 11 }}>
                        {label}
                      </Text>
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    {weekDays.map((date) => {
                      const isToday = toDayKey(date) === toDayKey(new Date());
                      const hasEvent = thisWeekEventKeys.has(toDayKey(date));
                      return (
                        <View key={toDayKey(date)} style={{ width: `${100 / 7}%`, alignItems: "center" }}>
                          <View
                            style={{
                              minWidth: 24,
                              minHeight: 24,
                              borderRadius: 999,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: isToday ? palette.colors.primary : palette.colors.transparent,
                            }}
                          >
                            <Text style={{ color: isToday ? palette.colors.onPrimary : palette.colors.text, fontSize: 12, fontWeight: "600" }}>
                              {date.getDate()}
                            </Text>
                          </View>
                          <View
                            style={{
                              marginTop: 3,
                              width: 5,
                              height: 5,
                              borderRadius: 999,
                              backgroundColor: hasEvent ? palette.colors.primary : palette.colors.transparent,
                            }}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
                <View style={{ flex: 1.3, minWidth: 0, gap: 8 }}>
                  {upcomingEvents.length === 0 ? (
                    <Text style={{ color: palette.colors.textMuted, fontSize: 13 }}>No upcoming events</Text>
                  ) : (
                    upcomingEvents.map((event) => {
                      const categoryMeta = categoryPill(event.category, palette.colors.accent);
                      return (
                        <View key={event.id} style={{ borderBottomWidth: 1, borderBottomColor: palette.colors.divider, paddingBottom: 6 }}>
                          <Text numberOfLines={1} style={{ color: palette.colors.text, fontWeight: "700", fontSize: 14 }}>
                            {event.title}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 }}>
                            <Text style={{ color: palette.colors.textMuted, fontSize: 12 }}>{shortMonthDay(event.startAt)}</Text>
                            <View
                              style={{
                                borderRadius: 999,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                backgroundColor: `${categoryMeta.color}22`,
                                borderWidth: 1,
                                borderColor: `${categoryMeta.color}66`,
                              }}
                            >
                              <Text style={{ color: categoryMeta.color, fontSize: 10, fontWeight: "700" }}>
                                {categoryMeta.label}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            </GlassSurface>
          )}
        </Pressable>

        {incomingChallenges.length > 0 ? (
          <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
            <Text
              style={{
                color: palette.colors.textMuted,
                fontWeight: "600",
                marginBottom: 8,
                letterSpacing: 0.8,
                fontSize: 13,
                textTransform: "uppercase",
              }}
            >
              Practice Challenges
            </Text>
            {incomingChallenges.slice(0, 3).map((challenge) => (
              <GlassSurface key={challenge.id} style={{ padding: 10, marginBottom: 8 }}>
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                  {challenge.challengerName} challenged you
                </Text>
                <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
                  {challenge.eventName} - expires in 24h
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <GlassButton
                    variant="solid"
                    size="sm"
                    label="Accept"
                    style={{ flex: 1 }}
                    onPress={async () => {
                    await respondToChallenge(challenge.id, true);
                    navigation.navigate("PracticeEventHub", {
                      eventId: challenge.eventId,
                      mode: "objective_test",
                      challengeId: challenge.id,
                    });
                  }}
                />
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    label="Decline"
                    style={{ flex: 1 }}
                    onPress={async () => {
                      await respondToChallenge(challenge.id, false);
                    }}
                  />
                </View>
              </GlassSurface>
            ))}
          </GlassSurface>
        ) : null}

        {recognitionRows.length > 0 ? (
          <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
            <Text
              style={{
                color: palette.colors.textMuted,
                fontWeight: "600",
                marginBottom: 8,
                letterSpacing: 0.8,
                fontSize: 13,
                textTransform: "uppercase",
              }}
            >
              Chapter Wins
            </Text>
            {recognitionRows.slice(0, 3).map((item) => (
              <View key={item.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: palette.colors.divider }}>
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                  {item.userName} placed {item.place}
                </Text>
                <Text style={{ color: palette.colors.textSecondary }}>
                  {item.eventName} • {item.level} {item.year} • {item.verified ? "Verified" : "Pending"}
                </Text>
              </View>
            ))}
          </GlassSurface>
        ) : null}

        {chapterGoals.length > 0 || permissions.canManageTasks() ? (
          <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
            <Text
              style={{
                color: palette.colors.textMuted,
                fontWeight: "600",
                marginBottom: 8,
                letterSpacing: 0.8,
                fontSize: 13,
                textTransform: "uppercase",
              }}
            >
              Chapter Goals
            </Text>
            {permissions.canManageTasks() && profile.chapterId ? (
              <GlassSurface style={{ padding: 10, marginBottom: 8 }}>
                <GlassInput
                  value={newGoalTitle}
                  onChangeText={setNewGoalTitle}
                  placeholder="New chapter goal title"
                />
                <GlassInput
                  containerStyle={{ marginTop: 8 }}
                  value={newGoalTarget}
                  onChangeText={setNewGoalTarget}
                  placeholder="Target"
                  keyboardType="numeric"
                />
                <GlassButton
                  variant="solid"
                  size="sm"
                  label="Create Goal"
                  style={{ marginTop: 8, alignSelf: "flex-start" }}
                  onPress={async () => {
                    const target = Number(newGoalTarget);
                    if (!newGoalTitle.trim() || !Number.isFinite(target) || target <= 0) {
                      return;
                    }
                    try {
                      await createChapterGoal(profile, {
                        title: newGoalTitle.trim(),
                        target,
                        unit: "items",
                        deadline: "",
                        category: "General",
                      });
                      setNewGoalTitle("");
                      setNewGoalTarget("10");
                    } catch (error) {
                      console.warn("Create goal failed:", error);
                    }
                  }}
                />
              </GlassSurface>
            ) : null}
            {chapterGoals.slice(0, 3).map((goal) => {
              const progress = goal.target > 0 ? Math.min(1, goal.progress / goal.target) : 0;
              return (
                <GlassSurface key={goal.id} style={{ padding: 10, marginBottom: 8 }}>
                  <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{goal.title}</Text>
                  <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
                    {goal.progress}/{goal.target} {goal.unit} • due {goal.deadline}
                  </Text>
                  <View style={{ height: 8, borderRadius: 999, marginTop: 8, backgroundColor: palette.colors.inputMuted, overflow: "hidden" }}>
                    <View style={{ width: `${Math.round(progress * 100)}%`, height: 8, backgroundColor: palette.colors.primary }} />
                  </View>
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    label="+1 Contribution"
                    style={{ marginTop: 8, alignSelf: "flex-start" }}
                    onPress={async () => {
                      try {
                        await submitGoalContribution(profile, goal.id, 1, "Quick contribution log");
                      } catch (error) {
                        console.warn("Goal contribution failed:", error);
                      }
                    }}
                  />
                </GlassSurface>
              );
            })}
            {chapterGoals.length === 0 ? (
              <Text style={{ color: palette.colors.textSecondary }}>No goals yet.</Text>
            ) : null}
          </GlassSurface>
        ) : null}

        {studySessions.length > 0 ? (
          <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
            <Text
              style={{
                color: palette.colors.textMuted,
                fontWeight: "600",
                marginBottom: 8,
                letterSpacing: 0.8,
                fontSize: 13,
                textTransform: "uppercase",
              }}
            >
              Group Study Live
            </Text>
            {studySessions.slice(0, 3).map((session) => (
              <GlassSurface key={session.id} style={{ padding: 10, marginBottom: 8 }}>
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                  {session.createdByName} is studying {session.eventNames.join(", ") || "FBLA"}
                </Text>
                <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
                  {session.participantIds.length} members - {session.mode === "practice_together" ? "Practice Together" : "Quiz Each Other"}
                </Text>
                <GlassButton
                  variant="solid"
                  size="sm"
                  label="Join"
                  style={{ marginTop: 8, alignSelf: "flex-start" }}
                  onPress={async () => {
                    try {
                      await joinStudySession(session.id, profile);
                    } catch (error) {
                      console.warn("Join session failed:", error);
                    }
                    navigation.navigate("StudySession", { sessionId: session.id });
                  }}
                />
              </GlassSurface>
            ))}
          </GlassSurface>
        ) : null}

        {permissions.canManageTasks() && officerTasks.length > 0 ? (
          <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
            <Text
              style={{
                color: palette.colors.textMuted,
                fontWeight: "600",
                marginBottom: 8,
                letterSpacing: 0.8,
                fontSize: 13,
                textTransform: "uppercase",
              }}
            >
              Officer Tasks
            </Text>
            <Text style={{ color: palette.colors.textSecondary, marginBottom: 8 }}>
              You have {officerTasks.filter((task) => task.status !== "done").length} tasks pending.
            </Text>
            <GlassButton variant="ghost" size="sm" label="Open Task Board" onPress={() => navigation.navigate("OfficerTasks")} />
          </GlassSurface>
        ) : null}

        {assignedActions.length > 0 ? (
          <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
            <Text
              style={{
                color: palette.colors.textMuted,
                fontWeight: "600",
                marginBottom: 8,
                letterSpacing: 0.8,
                fontSize: 13,
                textTransform: "uppercase",
              }}
            >
              Action Items
            </Text>
            {assignedActions.map((item) => (
              <GlassSurface key={item.id} style={{ padding: 10, marginBottom: 8 }}>
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                  You have an action item due {item.dueDate || "soon"}
                </Text>
                <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
                  {item.text}
                </Text>
                <Text style={{ color: palette.colors.textSecondary, marginTop: 4, fontSize: 12 }}>
                  From meeting {item.meetingDate}
                </Text>
              </GlassSurface>
            ))}
          </GlassSurface>
        ) : null}

        {!focusMode && settings.customize.showStoriesBar ? <FblaSocialSection /> : null}

        {!focusMode && settings.customize.showSocialFeed ? (
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
              <View style={{ paddingTop: 4 }}>
                <SkeletonCard height={74} />
                <SkeletonCard height={74} />
                <SkeletonCard height={74} />
              </View>
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
