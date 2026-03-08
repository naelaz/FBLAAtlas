import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native-paper";

import { AppImage } from "../components/media/AppImage";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { Badge } from "../components/ui/badge";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassDropdown } from "../components/ui/GlassDropdown";
import { GlassSurface } from "../components/ui/GlassSurface";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { getEventImageByCategory } from "../constants/media";
import { useAuthContext } from "../context/AuthContext";
import { useGamification } from "../context/GamificationContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import { formatDateTime } from "../services/firestoreUtils";
import { hapticTap } from "../services/haptics";
import {
  fetchEventsOnce,
  fetchSchoolUsersOnce,
  subscribeEvents,
  subscribeSchoolUsers,
  toggleEventAttendance,
} from "../services/socialService";
import { EventItem, UserProfile } from "../types/social";

const EVENT_FILTERS: Array<"All" | "Sports" | "Academic" | "Social" | "FBLA" | "Arts"> = [
  "All",
  "Sports",
  "Academic",
  "Social",
  "FBLA",
  "Arts",
];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function timeUntil(iso: string): string {
  const target = new Date(iso).getTime();
  const diff = Math.max(0, target - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function EventsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuthContext();
  const { handleAwardResult } = useGamification();
  const { palette } = useThemeContext();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<(typeof EVENT_FILTERS)[number]>("All");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDayKey, setSelectedDayKey] = useState(() => toDayKey(new Date()));

  useEffect(() => {
    const monthPrefix = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;
    if (!selectedDayKey.startsWith(monthPrefix)) {
      setSelectedDayKey(`${monthPrefix}-01`);
    }
  }, [calendarMonth, selectedDayKey]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const handleSubscriptionError = (label: string, error: unknown) => {
      console.warn(`${label} subscription failed:`, error);
    };

    const unsubscribers = [
      subscribeEvents(profile.schoolId, setEvents, (error) => handleSubscriptionError("Events", error)),
      subscribeSchoolUsers(profile.schoolId, setUsers, (error) => handleSubscriptionError("Users", error)),
    ];

    void Promise.all([fetchEventsOnce(profile.schoolId), fetchSchoolUsersOnce(profile.schoolId)])
      .then(([nextEvents, nextUsers]) => {
        setEvents(nextEvents);
        setUsers(nextUsers);
      })
      .catch((error) => {
        console.warn("Events bootstrap failed:", error);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [profile?.schoolId]);

  const refresh = async () => {
    if (!profile) {
      return;
    }

    setRefreshing(true);
    try {
      const [nextEvents, nextUsers] = await Promise.all([
        fetchEventsOnce(profile.schoolId),
        fetchSchoolUsersOnce(profile.schoolId),
      ]);
      setEvents(nextEvents);
      setUsers(nextUsers);
    } catch (error) {
      console.warn("Events refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const userLookup = useMemo(() => new Map(users.map((user) => [user.uid, user])), [users]);

  const filteredEvents = useMemo(() => {
    if (filter === "All") {
      return events;
    }
    return events.filter((event) => (event.category ?? "FBLA") === filter);
  }, [events, filter]);
  const viewOptions = useMemo(
    () => [
      { label: "List View", value: "list", description: "Cards with attendees and countdown" },
      { label: "Calendar View", value: "calendar", description: "Month grid with event density" },
    ],
    [],
  );
  const categoryOptions = useMemo(
    () =>
      EVENT_FILTERS.map((entry) => ({
        label: entry,
        value: entry,
        description: entry === "All" ? "Show all event categories" : `Only ${entry} events`,
      })),
    [],
  );

  const calendarRows = useMemo(() => {
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const startWeekday = monthStart.getDay();
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const eventsByKey = new Map<string, EventItem[]>();
    filteredEvents.forEach((event) => {
      const date = new Date(event.startAt);
      if (date.getFullYear() !== year || date.getMonth() !== month) {
        return;
      }
      const key = toDayKey(date);
      const next = eventsByKey.get(key) ?? [];
      next.push(event);
      eventsByKey.set(key, next);
    });

    const cells: Array<{ day: number | null; key: string | null; events: EventItem[] }> = [];
    for (let i = 0; i < startWeekday; i += 1) {
      cells.push({ day: null, key: null, events: [] });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const cellDate = new Date(year, month, day);
      const key = toDayKey(cellDate);
      cells.push({ day, key, events: eventsByKey.get(key) ?? [] });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, key: null, events: [] });
    }

    const rows = [] as Array<Array<{ day: number | null; key: string | null; events: EventItem[] }>>;
    for (let index = 0; index < cells.length; index += 7) {
      rows.push(cells.slice(index, index + 7));
    }
    return rows;
  }, [calendarMonth, filteredEvents]);

  const selectedDayEvents = useMemo(() => {
    for (const row of calendarRows) {
      for (const cell of row) {
        if (cell.key === selectedDayKey) {
          return [...cell.events].sort(
            (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
          );
        }
      }
    }
    return [];
  }, [calendarRows, selectedDayKey]);

  const monthTitle = useMemo(
    () =>
      calendarMonth.toLocaleString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [calendarMonth],
  );

  const listData = viewMode === "list" ? filteredEvents : selectedDayEvents;

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text>Loading events...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }} edges={["top", "left", "right"]}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 10 }}>
            <Text style={{ color: palette.colors.textSecondary, fontSize: 12, fontWeight: "700", marginBottom: 4 }}>
              Home / Events
            </Text>
            <Text variant="headlineSmall" style={{ fontWeight: "900", color: palette.colors.text }}>
              Events
            </Text>
            <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
              Track events and never miss a chapter moment.
            </Text>
            <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "flex-start" }}>
              <Pressable
                onPress={() => {
                  const parent = navigation.getParent();
                  if (parent) {
                    parent.navigate("Practice" as never);
                    return;
                  }
                  navigation.navigate("Practice");
                }}
                style={{ minHeight: 40 }}
              >
                {({ pressed }) => (
                  <GlassSurface
                    pressed={pressed}
                    tone="accent"
                    elevation={2}
                    style={{
                      minHeight: 40,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: palette.colors.primary,
                    }}
                  >
                    <Text style={{ color: palette.colors.onPrimary, fontWeight: "700" }}>
                      Open Practice Area
                    </Text>
                  </GlassSurface>
                )}
              </Pressable>
            </View>

            <View style={{ marginTop: 10, gap: 10 }}>
              <GlassDropdown
                label="View"
                value={viewMode}
                options={viewOptions}
                onValueChange={(nextValue) => {
                  if (nextValue === "list" || nextValue === "calendar") {
                    setViewMode(nextValue);
                  }
                }}
              />
              <GlassDropdown
                label="Category"
                value={filter}
                options={categoryOptions}
                onValueChange={(nextValue) => {
                  if (EVENT_FILTERS.includes(nextValue as (typeof EVENT_FILTERS)[number])) {
                    setFilter(nextValue as (typeof EVENT_FILTERS)[number]);
                  }
                }}
              />
            </View>

            {viewMode === "calendar" ? (
              <GlassSurface style={{ marginTop: 10, padding: 10, backgroundColor: palette.colors.surface }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Pressable
                    onPress={() =>
                      setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                    }
                    style={{
                      minWidth: 36,
                      minHeight: 36,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: palette.colors.inputSurface,
                    }}
                  >
                    <ChevronLeft size={16} color={palette.colors.text} />
                  </Pressable>
                  <Text style={{ color: palette.colors.text, fontWeight: "800" }}>{monthTitle}</Text>
                  <Pressable
                    onPress={() =>
                      setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                    }
                    style={{
                      minWidth: 36,
                      minHeight: 36,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: palette.colors.inputSurface,
                    }}
                  >
                    <ChevronRight size={16} color={palette.colors.text} />
                  </Pressable>
                </View>

                <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
                  {WEEKDAY_LABELS.map((label) => (
                    <View key={label} style={{ flex: 1, alignItems: "center" }}>
                      <Text style={{ color: palette.colors.textSecondary, fontSize: 11, fontWeight: "700" }}>{label}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ gap: 6 }}>
                  {calendarRows.map((row, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={{ flexDirection: "row", gap: 6 }}>
                      {row.map((cell, cellIndex) => {
                        const selected = cell.key === selectedDayKey;
                        return (
                          <Pressable
                            key={`cell-${rowIndex}-${cellIndex}`}
                            disabled={!cell.day}
                            onPress={() => {
                              if (cell.key) {
                                setSelectedDayKey(cell.key);
                              }
                            }}
                            style={{ flex: 1 }}
                          >
                            <GlassSurface
                              style={{
                                minHeight: 50,
                                padding: 6,
                                backgroundColor: selected ? palette.colors.primary : palette.colors.glass,
                                borderColor: selected ? palette.colors.primary : palette.colors.glassBorder,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text style={{ color: selected ? palette.colors.onPrimary : palette.colors.text, fontWeight: "700" }}>
                                {cell.day ?? ""}
                              </Text>
                              {cell.events.length > 0 ? (
                                <Text style={{ color: selected ? palette.colors.onPrimary : palette.colors.primary, fontSize: 11 }}>
                                  {cell.events.length}
                                </Text>
                              ) : null}
                            </GlassSurface>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>

                <Text style={{ color: palette.colors.textSecondary, marginTop: 8 }}>
                  {selectedDayEvents.length > 0
                    ? `Showing ${selectedDayEvents.length} event(s) on ${selectedDayKey}.`
                    : `No events on ${selectedDayKey}.`}
                </Text>
              </GlassSurface>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const attending = item.attendeeIds.includes(profile.uid);
          const attendees = item.attendeeIds
            .map((id) => userLookup.get(id))
            .filter((user): user is UserProfile => Boolean(user));

          return (
            <Pressable
              onPress={() => navigation.navigate("EventDetail", { eventId: item.id })}
              style={{ borderRadius: 18, overflow: "hidden", marginBottom: 6 }}
            >
              <View style={{ width: "100%", height: 224 }}>
                <AppImage
                  uri={item.coverImageUrl ?? getEventImageByCategory(item.category, item.id)}
                  style={{ position: "absolute", left: 0, right: 0, top: 0, height: "56%" }}
                />
                <LinearGradient
                  colors={[palette.colors.transparent, palette.colors.imageOverlay, palette.colors.surface]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={{ position: "absolute", left: 0, right: 0, top: "40%", bottom: 0 }}
                />
                <View style={{ position: "absolute", left: 10, top: 10 }}>
                  <Badge size="sm" variant="blue-subtle" capitalize={false}>
                    {item.category ?? "FBLA"}
                  </Badge>
                </View>
              </View>
              <GlassSurface
                style={{
                  position: "absolute",
                  left: 10,
                  right: 10,
                  bottom: 10,
                  padding: 10,
                  backgroundColor: palette.colors.glassStrong,
                  borderColor: palette.colors.glassBorder,
                }}
              >
                <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 17 }}>
                  {item.title}
                </Text>
                <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
                  {formatDateTime(item.startAt)} • {item.location}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ color: palette.colors.warning, fontWeight: "700" }}>
                      Starts in {timeUntil(item.startAt)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 5 }}>
                    {attendees.slice(0, 4).map((attendee) => (
                      <AvatarWithStatus key={attendee.uid} uri={attendee.avatarUrl} size={26} online={false} />
                    ))}
                  </View>
                </View>
                <Pressable
                  style={{ marginTop: 8, alignSelf: "flex-start" }}
                  onPress={async (e) => {
                    e.stopPropagation();
                    hapticTap();
                    try {
                      const result = await toggleEventAttendance(item, profile);
                      handleAwardResult(result.award, { eventName: item.title });
                    } catch (error) {
                      console.warn("Event attendance failed:", error);
                    }
                  }}
                >
                  {({ pressed }) => (
                    <GlassSurface
                      pressed={pressed}
                      tone={attending ? "neutral" : "accent"}
                      strong={!attending}
                      borderRadius={999}
                      style={{
                        minHeight: 36,
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: attending ? palette.colors.chipSurface : palette.colors.primary,
                      }}
                    >
                      <Text style={{ color: attending ? palette.colors.text : palette.colors.onPrimary, fontWeight: "800" }}>
                        {attending ? "Leave" : "Join"}
                      </Text>
                    </GlassSurface>
                  )}
                </Pressable>
              </GlassSurface>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View>
              <SkeletonCard height={190} />
              <SkeletonCard height={190} />
            </View>
          ) : (
            <EmptyState
              title={viewMode === "calendar" ? "No Events On This Day" : "No Events Found"}
              message={
                viewMode === "calendar"
                  ? "Pick another day or category to view events."
                  : "Try another category filter."
              }
            />
          )
        }
      />
    </SafeAreaView>
  );
}
