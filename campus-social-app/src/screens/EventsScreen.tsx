import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native-paper";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react-native";

import { EmptyState } from "../components/ui/EmptyState";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassDropdown } from "../components/ui/GlassDropdown";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSegmentedControl } from "../components/ui/GlassSegmentedControl";
import { GlassSurface } from "../components/ui/GlassSurface";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { useAuthContext } from "../context/AuthContext";
import { useGamification } from "../context/GamificationContext";
import { useSettings } from "../context/SettingsContext";
import { useThemeContext } from "../context/ThemeContext";
import { useNavBarScroll } from "../hooks/useNavBarScroll";
import { usePermissions } from "../hooks/usePermissions";
import { RootStackParamList } from "../navigation/types";
import {
  createChapterEvent,
  createMeetingNote,
  fetchChapterEvents,
  fetchMeetingNotes,
  toggleChapterEventRsvp,
} from "../services/chapterService";
import { formatDateTime } from "../services/firestoreUtils";
import { hapticTap } from "../services/haptics";
import {
  fetchEventsOnce,
  fetchSchoolUsersOnce,
  subscribeEvents,
  toggleEventAttendance,
} from "../services/socialService";
import { ChapterEventItem, MeetingNote } from "../types/features";
import { EventItem } from "../types/social";

const EVENT_FILTERS: Array<"All" | "Sports" | "Academic" | "Social" | "FBLA" | "Arts"> = [
  "All",
  "Sports",
  "Academic",
  "Social",
  "FBLA",
  "Arts",
];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

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
  const { settings } = useSettings();
  const { palette } = useThemeContext();
  const { onScroll, onScrollBeginDrag, scrollEventThrottle } = useNavBarScroll();
  const permissions = usePermissions();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [chapterEvents, setChapterEvents] = useState<ChapterEventItem[]>([]);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chapterLoading, setChapterLoading] = useState(false);

  const [eventsScope, setEventsScope] = useState<"official" | "chapter">("official");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<(typeof EVENT_FILTERS)[number]>("All");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDayKey, setSelectedDayKey] = useState(() => toDayKey(new Date()));

  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");

  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [meetingAgenda, setMeetingAgenda] = useState("");
  const [meetingDecisions, setMeetingDecisions] = useState("");
  const [meetingActions, setMeetingActions] = useState("");

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
    const unsubscribe = subscribeEvents(profile.schoolId, setEvents, (error) => {
      console.warn("Events subscription failed:", error);
    });

    void fetchEventsOnce(profile.schoolId)
      .then((rows) => setEvents(rows))
      .catch((error) => console.warn("Events bootstrap failed:", error))
      .finally(() => setLoading(false));

    return unsubscribe;
  }, [profile?.schoolId]);

  const loadChapterData = async () => {
    if (!profile?.chapterId) {
      setChapterEvents([]);
      setMeetingNotes([]);
      return;
    }
    setChapterLoading(true);
    try {
      const [eventsRows, notesRows] = await Promise.all([
        fetchChapterEvents(profile.chapterId),
        fetchMeetingNotes(profile.chapterId),
      ]);
      setChapterEvents(eventsRows);
      setMeetingNotes(notesRows);
    } catch (error) {
      console.warn("Chapter events load failed:", error);
    } finally {
      setChapterLoading(false);
    }
  };

  useEffect(() => {
    void loadChapterData();
  }, [profile?.chapterId]);

  const refresh = async () => {
    if (!profile) return;
    setRefreshing(true);
    try {
      const rows = await fetchEventsOnce(profile.schoolId);
      setEvents(rows);
      await loadChapterData();
    } catch (error) {
      console.warn("Events refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredEvents = useMemo(() => {
    if (filter === "All") return events;
    return events.filter((event) => (event.category ?? "FBLA") === filter);
  }, [events, filter]);

  const calendarRows = useMemo(() => {
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const startWeekday = monthStart.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const byDay = new Map<string, EventItem[]>();
    filteredEvents.forEach((event) => {
      const date = new Date(event.startAt);
      if (date.getFullYear() !== year || date.getMonth() !== month) return;
      const key = toDayKey(date);
      const next = byDay.get(key) ?? [];
      next.push(event);
      byDay.set(key, next);
    });

    const cells: Array<{ day: number | null; key: string | null; events: EventItem[] }> = [];
    for (let i = 0; i < startWeekday; i += 1) cells.push({ day: null, key: null, events: [] });
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = toDayKey(new Date(year, month, day));
      cells.push({ day, key, events: byDay.get(key) ?? [] });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, key: null, events: [] });

    const rows: Array<Array<{ day: number | null; key: string | null; events: EventItem[] }>> = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [calendarMonth, filteredEvents]);

  const selectedDayEvents = useMemo(() => {
    for (const row of calendarRows) {
      for (const cell of row) {
        if (cell.key === selectedDayKey) return cell.events;
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

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text>Loading events...</Text>
      </SafeAreaView>
    );
  }

  const header = (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: palette.colors.textMuted, fontSize: 11, fontWeight: "700", marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>
        Home / Events
      </Text>
      <Text variant="headlineSmall" style={{ fontWeight: "700", fontSize: 22, color: palette.colors.text }}>
        Events
      </Text>
      <Text style={{ color: palette.colors.textMuted, marginTop: 4, fontSize: 14 }}>
        Official competition events and chapter calendar.
      </Text>

      <View style={{ marginTop: 10 }}>
        <GlassSegmentedControl
          value={eventsScope}
          options={[
            { value: "official", label: "Official" },
            { value: "chapter", label: "Chapter" },
          ]}
          onValueChange={(value) => {
            if (value === "official" || value === "chapter") setEventsScope(value);
          }}
        />
      </View>
    </View>
  );

  if (eventsScope === "chapter") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }} edges={["top", "left", "right"]}>
        <LinearGradient
          pointerEvents="none"
          colors={
            palette.isDark
              ? [palette.colors.background, palette.colors.surfaceAlt]
              : [palette.colors.background, palette.colors.surface]
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={scrollEventThrottle}
          onScroll={onScroll}
          onScrollBeginDrag={onScrollBeginDrag}
        >
          {header}
          {!profile.chapterId ? (
            <EmptyState title="Join a chapter first" message="Join your chapter to unlock chapter events and notes." />
          ) : (
            <>
              <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ color: palette.colors.text, fontWeight: "800" }}>Chapter Calendar</Text>
                  {permissions.canManageTasks() ? (
                    <GlassButton variant="ghost" size="sm" label="Officer Tasks" onPress={() => navigation.navigate("OfficerTasks")} />
                  ) : null}
                </View>

                {permissions.canCreateEvent() ? (
                  <>
                    <GlassInput label="Event Title" value={newEventTitle} onChangeText={setNewEventTitle} />
                    <GlassInput containerStyle={{ marginTop: 8 }} label="Date/Time (ISO)" value={newEventDate} onChangeText={setNewEventDate} placeholder="2026-11-14T09:00:00.000Z" />
                    <GlassInput containerStyle={{ marginTop: 8 }} label="Location" value={newEventLocation} onChangeText={setNewEventLocation} />
                    <GlassInput containerStyle={{ marginTop: 8 }} label="Description" value={newEventDescription} onChangeText={setNewEventDescription} multiline />
                    <GlassButton
                      variant="solid"
                      label="Create Chapter Event"
                      style={{ marginTop: 10 }}
                      onPress={async () => {
                        if (!newEventTitle.trim() || !newEventDate.trim()) return;
                        await createChapterEvent(profile, {
                          title: newEventTitle.trim(),
                          dateTime: newEventDate.trim(),
                          description: newEventDescription.trim(),
                          location: newEventLocation.trim(),
                          mandatory: false,
                          rsvpEnabled: true,
                          capacity: undefined,
                        });
                        setNewEventTitle("");
                        setNewEventDate("");
                        setNewEventLocation("");
                        setNewEventDescription("");
                        await loadChapterData();
                      }}
                    />
                  </>
                ) : null}
              </GlassSurface>

              {chapterLoading && chapterEvents.length === 0 ? (
                <>
                  <SkeletonCard height={140} />
                  <SkeletonCard height={140} />
                </>
              ) : chapterEvents.length === 0 ? (
                <EmptyState title="No chapter events" message="Officers can create chapter meetings and sessions here." />
              ) : (
                chapterEvents.map((event) => {
                  const going = event.attendeeIds.includes(profile.uid);
                  return (
                    <GlassSurface key={event.id} style={{ padding: 12, marginBottom: 8 }}>
                      <Text style={{ color: palette.colors.text, fontWeight: "800" }}>{event.title}</Text>
                      <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
                        {formatDateTime(event.dateTime)} - {event.location || "TBD"}
                      </Text>
                      {event.description ? <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>{event.description}</Text> : null}
                      <Text style={{ color: palette.colors.textMuted, marginTop: 4, fontSize: 12 }}>{event.attendeeIds.length} RSVP</Text>
                      {event.rsvpEnabled ? (
                        <GlassButton
                          variant={going ? "ghost" : "solid"}
                          size="sm"
                          label={going ? "Going" : "RSVP"}
                          style={{ marginTop: 8, alignSelf: "flex-start" }}
                          onPress={async () => {
                            await toggleChapterEventRsvp(event.id, profile.uid);
                            await loadChapterData();
                          }}
                        />
                      ) : null}
                    </GlassSurface>
                  );
                })
              )}

              <GlassSurface style={{ padding: 12, marginBottom: 12, marginTop: 4 }}>
                <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>Meeting Notes</Text>
                {permissions.canPostMeetingNotes() ? (
                  <>
                    <GlassInput label="Meeting Date" value={meetingDate} onChangeText={setMeetingDate} placeholder="YYYY-MM-DD" />
                    <GlassInput containerStyle={{ marginTop: 8 }} label="Agenda (one per line)" value={meetingAgenda} onChangeText={setMeetingAgenda} multiline />
                    <GlassInput containerStyle={{ marginTop: 8 }} label="Decisions (one per line)" value={meetingDecisions} onChangeText={setMeetingDecisions} multiline />
                    <GlassInput containerStyle={{ marginTop: 8 }} label="Action Items (one per line)" value={meetingActions} onChangeText={setMeetingActions} multiline />
                    <GlassButton
                      variant="solid"
                      label="Post Meeting Notes"
                      style={{ marginTop: 10 }}
                      onPress={async () => {
                        const agenda = splitLines(meetingAgenda);
                        if (!meetingDate.trim() || agenda.length === 0) return;
                        await createMeetingNote(profile, {
                          meetingDate: meetingDate.trim(),
                          agenda,
                          decisions: splitLines(meetingDecisions),
                          attendees: [],
                          actionItems: splitLines(meetingActions).map((text) => ({
                            id: `${text}_${Date.now().toString(36)}`,
                            text,
                            assigneeUid: "",
                            assigneeName: "",
                            dueDate: "",
                            done: false,
                          })),
                        });
                        setMeetingAgenda("");
                        setMeetingDecisions("");
                        setMeetingActions("");
                        await loadChapterData();
                      }}
                    />
                  </>
                ) : null}

                {meetingNotes.length === 0 ? (
                  <Text style={{ color: palette.colors.textSecondary, marginTop: 10 }}>No notes posted yet.</Text>
                ) : (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {meetingNotes.map((note) => (
                      <GlassSurface key={note.id} style={{ padding: 10 }}>
                        <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{note.meetingDate}</Text>
                        {note.agenda.length > 0 ? <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>Agenda: {note.agenda.join(" - ")}</Text> : null}
                        {note.decisions.length > 0 ? <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>Decisions: {note.decisions.join(" - ")}</Text> : null}
                        {note.actionItems.length > 0 ? <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>Action Items: {note.actionItems.map((i) => i.text).join(" - ")}</Text> : null}
                      </GlassSurface>
                    ))}
                  </View>
                )}
              </GlassSurface>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const listData = viewMode === "list" ? filteredEvents : selectedDayEvents;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }} edges={["top", "left", "right"]}>
      <LinearGradient
        pointerEvents="none"
        colors={
          palette.isDark
            ? [palette.colors.background, palette.colors.surfaceAlt]
            : [palette.colors.background, palette.colors.surface]
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={scrollEventThrottle}
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 10 }}>
            {header}
            <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "flex-start" }}>
              <GlassButton variant="solid" size="sm" label="Open Practice Area" onPress={() => navigation.navigate("Practice")} />
            </View>

            <View style={{ marginTop: 10, gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable style={{ flex: 1 }} onPress={() => setViewMode("list")}>{({ pressed }) => (
                  <GlassSurface pressed={pressed} style={{ minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: viewMode === "list" ? palette.colors.primary : palette.colors.border, backgroundColor: viewMode === "list" ? palette.colors.primary : palette.colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <List size={16} color={viewMode === "list" ? palette.colors.onPrimary : palette.colors.text} />
                    <Text style={{ color: viewMode === "list" ? palette.colors.onPrimary : palette.colors.text, fontWeight: "700" }}>List</Text>
                  </GlassSurface>
                )}</Pressable>
                <Pressable style={{ flex: 1 }} onPress={() => setViewMode("calendar")}>{({ pressed }) => (
                  <GlassSurface pressed={pressed} style={{ minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: viewMode === "calendar" ? palette.colors.primary : palette.colors.border, backgroundColor: viewMode === "calendar" ? palette.colors.primary : palette.colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <CalendarDays size={16} color={viewMode === "calendar" ? palette.colors.onPrimary : palette.colors.text} />
                    <Text style={{ color: viewMode === "calendar" ? palette.colors.onPrimary : palette.colors.text, fontWeight: "700" }}>Calendar</Text>
                  </GlassSurface>
                )}</Pressable>
              </View>

              <GlassDropdown
                label="Category"
                value={filter}
                options={EVENT_FILTERS.map((entry) => ({ label: entry, value: entry }))}
                onValueChange={(next) => {
                  if (EVENT_FILTERS.includes(next as (typeof EVENT_FILTERS)[number])) {
                    setFilter(next as (typeof EVENT_FILTERS)[number]);
                  }
                }}
              />
            </View>

            {viewMode === "calendar" ? (
              <GlassSurface style={{ marginTop: 10, padding: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Pressable onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} style={{ minWidth: 36, minHeight: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: palette.colors.inputSurface }}>
                    <ChevronLeft size={16} color={palette.colors.text} />
                  </Pressable>
                  <Text style={{ color: palette.colors.text, fontWeight: "600", fontSize: 16 }}>{monthTitle}</Text>
                  <Pressable onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} style={{ minWidth: 36, minHeight: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: palette.colors.inputSurface }}>
                    <ChevronRight size={16} color={palette.colors.text} />
                  </Pressable>
                </View>

                <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
                  {WEEKDAY_LABELS.map((label) => (
                    <View key={label} style={{ flex: 1, alignItems: "center" }}>
                      <Text style={{ color: palette.colors.textMuted, fontSize: 12, fontWeight: "600" }}>{label}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ gap: 6 }}>
                  {calendarRows.map((row, rowIndex) => (
                    <View key={`row_${rowIndex}`} style={{ flexDirection: "row", gap: 6 }}>
                      {row.map((cell, cellIndex) => {
                        const selected = cell.key === selectedDayKey;
                        return (
                          <Pressable key={`cell_${rowIndex}_${cellIndex}`} disabled={!cell.day} onPress={() => cell.key && setSelectedDayKey(cell.key)} style={{ flex: 1 }}>
                            <GlassSurface style={{ minHeight: 50, padding: 6, backgroundColor: selected ? palette.colors.primary : palette.colors.glass, borderColor: selected ? palette.colors.primary : palette.colors.glassBorder, alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ color: selected ? palette.colors.onPrimary : palette.colors.text, fontWeight: "700" }}>{cell.day ?? ""}</Text>
                              {cell.events.length > 0 ? <Text style={{ color: selected ? palette.colors.onPrimary : palette.colors.primary, fontSize: 11 }}>{cell.events.length}</Text> : null}
                            </GlassSurface>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </GlassSurface>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const attending = item.attendeeIds.includes(profile.uid);
          return (
            <GlassSurface style={{ padding: 12, marginBottom: 10 }}>
              <Text style={{ color: palette.colors.text, fontWeight: "800" }}>{item.title}</Text>
              <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>{formatDateTime(item.startAt)} - {item.location}</Text>
              {item.description ? <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>{item.description}</Text> : null}
              <Text style={{ color: palette.colors.textMuted, marginTop: 4, fontSize: 12 }}>Starts in {timeUntil(item.startAt)}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <GlassButton
                  variant={attending ? "ghost" : "solid"}
                  size="sm"
                  label={attending ? "Leave" : "Join"}
                  onPress={async () => {
                    hapticTap();
                    const result = await toggleEventAttendance(item, profile, {
                      notifyEventReminder: settings.notifications.globalPush && settings.notifications.eventReminders,
                    });
                    handleAwardResult(result.award, { eventName: item.title });
                  }}
                />
                <GlassButton variant="ghost" size="sm" label="Details" onPress={() => navigation.navigate("EventDetail", { eventId: item.id })} />
              </View>
            </GlassSurface>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View>
              <SkeletonCard height={180} />
              <SkeletonCard height={180} />
            </View>
          ) : (
            <EmptyState title="No events" message="Try another category or date." />
          )
        }
      />
    </SafeAreaView>
  );
}

