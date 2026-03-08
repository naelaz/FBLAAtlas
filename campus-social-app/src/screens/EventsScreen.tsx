import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Button, Chip, SegmentedButtons, Text } from "react-native-paper";

import { EmptyState } from "../components/ui/EmptyState";
import { GlassSurface } from "../components/ui/GlassSurface";
import { SkeletonCard } from "../components/ui/SkeletonCard";
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

  const calendarRows = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    const startWeekday = monthStart.getDay();
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ day: number | null; events: EventItem[] }> = [];
    for (let i = 0; i < startWeekday; i += 1) {
      cells.push({ day: null, events: [] });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dayEvents = filteredEvents.filter((event) => {
        const date = new Date(event.startAt);
        return date.getDate() === day && date.getMonth() === month && date.getFullYear() === year;
      });
      cells.push({ day, events: dayEvents });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, events: [] });
    }

    const rows = [] as Array<Array<{ day: number | null; events: EventItem[] }>>;
    for (let index = 0; index < cells.length; index += 7) {
      rows.push(cells.slice(index, index + 7));
    }
    return rows;
  }, [filteredEvents]);

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
        data={viewMode === "list" ? filteredEvents : []}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 10 }}>
            <Text variant="headlineSmall" style={{ fontWeight: "900", color: "#0F172A" }}>
              Events
            </Text>
            <Text style={{ color: "#64748B", marginTop: 4 }}>Track events and never miss a chapter moment.</Text>

            <SegmentedButtons
              value={viewMode}
              onValueChange={(value) => {
                if (value === "list" || value === "calendar") {
                  setViewMode(value);
                }
              }}
              style={{ marginTop: 10 }}
              buttons={[
                { value: "list", label: "List" },
                { value: "calendar", label: "Calendar" },
              ]}
            />

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {EVENT_FILTERS.map((label) => (
                <Chip
                  key={label}
                  selected={filter === label}
                  onPress={() => {
                    hapticTap();
                    setFilter(label);
                  }}
                >
                  {label}
                </Chip>
              ))}
            </View>
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
              <Image source={item.coverImageUrl ?? "https://picsum.photos/900/500?random=502"} style={{ width: "100%", height: 188 }} />
              <GlassSurface
                style={{
                  position: "absolute",
                  left: 10,
                  right: 10,
                  bottom: 10,
                  padding: 10,
                  backgroundColor: "rgba(15,23,42,0.62)",
                  borderColor: "rgba(148,163,184,0.45)",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900", fontSize: 17 }}>{item.title}</Text>
                <Text style={{ color: "#CBD5E1", marginTop: 2 }}>
                  {formatDateTime(item.startAt)} • {item.location}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Chip compact>{item.category ?? "FBLA"}</Chip>
                    <Text style={{ color: "#FBBF24", fontWeight: "700" }}>Starts in {timeUntil(item.startAt)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 5 }}>
                    {attendees.slice(0, 4).map((attendee) => (
                      <Avatar.Image key={attendee.uid} size={26} source={{ uri: attendee.avatarUrl }} />
                    ))}
                  </View>
                </View>
                <Button
                  mode={attending ? "outlined" : "contained"}
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
                  {attending ? "Leave" : "Join"}
                </Button>
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
          ) : viewMode === "calendar" ? (
            <View style={{ marginTop: 6, gap: 8 }}>
              {calendarRows.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={{ flexDirection: "row", gap: 6 }}>
                  {row.map((cell, cellIndex) => (
                    <GlassSurface
                      key={`cell-${rowIndex}-${cellIndex}`}
                      style={{
                        flex: 1,
                        minHeight: 52,
                        padding: 6,
                        backgroundColor: "rgba(255,255,255,0.8)",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700" }}>{cell.day ?? ""}</Text>
                      {cell.events.length > 0 ? (
                        <Text numberOfLines={1} style={{ fontSize: 11, color: "#2563EB" }}>
                          {cell.events.length} event
                        </Text>
                      ) : null}
                    </GlassSurface>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <EmptyState title="No Events Found" message="Try another category filter." />
          )
        }
      />
    </SafeAreaView>
  );
}
