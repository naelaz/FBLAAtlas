import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image } from "expo-image";
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
import { DEFAULT_IMAGE_BLURHASH, getEventImageByCategory } from "../constants/media";
import { ChapterEventItem, MeetingNote } from "../types/features";
import { EventItem } from "../types/social";
import { db } from "../config/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Demo attendees shown as avatar clusters on fallback events
const DEMO_ATTENDEE_AVATARS: Record<string, { name: string; color: string }> = {
  demo_alex:     { name: "Alex M.",   color: "#FF8B94" },
  demo_jordan_k: { name: "Jordan K.", color: "#6C63FF" },
  demo_sam_r:    { name: "Sam R.",    color: "#4ECDC4" },
  demo_taylor_b: { name: "Taylor B.", color: "#FFD93D" },
  demo_riley_c:  { name: "Riley C.",  color: "#A8E6CF" },
  demo_morgan_l: { name: "Morgan L.", color: "#FF6B6B" },
  demo_avery_n:  { name: "Avery N.",  color: "#45B7D1" },
  demo_piper_m:  { name: "Piper M.",  color: "#96CEB4" },
  demo_reese_o:  { name: "Reese O.",  color: "#DDA0DD" },
};

async function ensureEventInFirestore(event: EventItem): Promise<void> {
  const ref = doc(db, "events", event.id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      schoolId: event.schoolId,
      title: event.title,
      description: event.description ?? "",
      location: event.location ?? "",
      category: event.category ?? "FBLA",
      startAt: event.startAt,
      attendeeIds: event.attendeeIds ?? [],
      attendeeCount: event.attendeeCount ?? 0,
      capacity: event.capacity ?? 100,
      createdAt: new Date().toISOString(),
    });
  }
}

const EVENT_FILTERS: Array<"All" | "Sports" | "Academic" | "Social" | "FBLA" | "Arts"> = [
  "All",
  "Sports",
  "Academic",
  "Social",
  "FBLA",
  "Arts",
];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function buildFallbackEvents(schoolId: string): EventItem[] {
  const now = Date.now();
  const day = 1000 * 60 * 60 * 24;
  const hour = 1000 * 60 * 60;
  return [
    {
      id: "fb_1", schoolId, title: "Chapter Meeting", description: "Weekly chapter meeting. Competition updates, upcoming deadlines, and committee reports.", location: "Room 112", category: "FBLA",
      startAt: new Date(now + hour * 3).toISOString(), attendeeIds: [], attendeeCount: 18, capacity: 60,
    },
    {
      id: "fb_2", schoolId, title: "Public Speaking Practice", description: "Open mic session for members to practice speeches and get peer feedback. All skill levels welcome.", location: "Auditorium",
      category: "Academic", startAt: new Date(now + day + hour * 4).toISOString(), attendeeIds: [], attendeeCount: 9, capacity: 25,
    },
    {
      id: "fb_3", schoolId, title: "Business Plan Review Session", description: "Bring your draft business plans for peer review. Officers and returning competitors provide feedback based on FBLA judging criteria.", location: "Library Conference Room",
      category: "FBLA", startAt: new Date(now + day * 2 + hour * 5).toISOString(), attendeeIds: [], attendeeCount: 7, capacity: 20,
    },
    {
      id: "fb_4", schoolId, title: "Study Session: Objective Tests", description: "Group study for objective test events — Business Law, Economics, Accounting. Share study guides and quiz each other.", location: "Room 204",
      category: "Academic", startAt: new Date(now + day * 3 + hour * 4).toISOString(), attendeeIds: [], attendeeCount: 12, capacity: 20,
    },
    {
      id: "fb_5", schoolId, title: "Mock Interview Workshop", description: "Practice professional interviews with local business volunteers. Receive real-time feedback on your responses, body language, and presentation.", location: "Career Center, Building B",
      category: "Academic", startAt: new Date(now + day * 4 + hour * 3).toISOString(), attendeeIds: [], attendeeCount: 14, capacity: 30,
    },
    {
      id: "fb_6", schoolId, title: "FBLA Spirit Week Kickoff", description: "Celebrate FBLA Week! Wear your chapter shirts, participate in daily challenges, and earn extra XP all week.", location: "Main Hallway & Cafeteria",
      category: "Social", startAt: new Date(now + day * 5).toISOString(), attendeeIds: [], attendeeCount: 35, capacity: 100,
    },
    {
      id: "fb_7", schoolId, title: "Presentation Skills Bootcamp", description: "Intensive 3-hour workshop on building compelling presentations. Cover slide design, storytelling, and handling judge Q&A.", location: "Computer Lab, Room 310",
      category: "Academic", startAt: new Date(now + day * 6 + hour * 2).toISOString(), attendeeIds: [], attendeeCount: 11, capacity: 25,
    },
    {
      id: "fb_8", schoolId, title: "Fundraiser: Business Trivia Night", description: "Test your business knowledge in a fun team trivia format. Entry fee goes toward SLC travel costs. Pizza and drinks provided.", location: "School Cafeteria",
      category: "Social", startAt: new Date(now + day * 8 + hour * 6).toISOString(), attendeeIds: [], attendeeCount: 22, capacity: 80,
    },
    {
      id: "fb_9", schoolId, title: "Officer Elections", description: "Annual chapter officer elections. Candidates deliver 2-minute speeches followed by a vote. All members encouraged to attend.", location: "Room 112",
      category: "FBLA", startAt: new Date(now + day * 10 + hour * 4).toISOString(), attendeeIds: [], attendeeCount: 40, capacity: 60,
    },
    {
      id: "fb_10", schoolId, title: "Coding Sprint: App Dev Prep", description: "Timed coding challenge to simulate competition conditions. Build a small app feature in 60 minutes, then present your solution.", location: "Computer Lab, Room 310",
      category: "Academic", startAt: new Date(now + day * 11 + hour * 3).toISOString(), attendeeIds: [], attendeeCount: 8, capacity: 20,
    },
    {
      id: "fb_11", schoolId, title: "Guest Speaker: Young Entrepreneur Panel", description: "Three local entrepreneurs under 25 share their startup journeys and answer your questions. Excellent networking opportunity.", location: "Auditorium",
      category: "FBLA", startAt: new Date(now + day * 14 + hour * 5).toISOString(), attendeeIds: [], attendeeCount: 28, capacity: 100,
    },
    {
      id: "fb_12", schoolId, title: "Chapter Social: Game Night", description: "Unwind with your chapter! Board games, snacks, and team building. A great way to meet new members before competition season.", location: "Student Lounge",
      category: "Social", startAt: new Date(now + day * 16 + hour * 6).toISOString(), attendeeIds: [], attendeeCount: 30, capacity: 50,
    },
    {
      id: "fb_13", schoolId, title: "Resume Workshop", description: "Learn to build a professional resume for job applications and FBLA portfolios. Bring a laptop to create yours during the session.", location: "Career Center, Room 105",
      category: "Academic", startAt: new Date(now + day * 18 + hour * 3).toISOString(), attendeeIds: [], attendeeCount: 16, capacity: 30,
    },
    {
      id: "fb_14", schoolId, title: "Community Service: Financial Literacy Day", description: "Teach basic financial literacy to middle school students. Counts toward community service hours and FBLA portfolio.", location: "Jefferson Middle School",
      category: "Social", startAt: new Date(now + day * 21 + hour * 2).toISOString(), attendeeIds: [], attendeeCount: 10, capacity: 15,
    },
    {
      id: "fb_15", schoolId, title: "District Leadership Conference", description: "Compete at the district level in your registered events. Top placers advance to SLC. Dress code: professional business attire required.", location: "Convention Center",
      category: "FBLA", startAt: new Date(now + day * 35 + hour * 8).toISOString(), attendeeIds: [], attendeeCount: 45, capacity: 120,
    },
    {
      id: "fb_16", schoolId, title: "Networking Mixer", description: "Casual networking event with local business professionals and FBLA alumni. Practice your elevator pitch and make real connections.", location: "School Commons",
      category: "Social", startAt: new Date(now + day * 25 + hour * 5).toISOString(), attendeeIds: [], attendeeCount: 19, capacity: 50,
    },
    {
      id: "fb_17", schoolId, title: "Accounting Study Group", description: "Collaborative study session for Accounting event prep. Tutoring available from returning competitors.", location: "Library Study Room B",
      category: "Academic", startAt: new Date(now + day * 1 + hour * 6).toISOString(), attendeeIds: [], attendeeCount: 6, capacity: 15,
    },
    {
      id: "fb_18", schoolId, title: "State Leadership Conference", description: "State-level competition. Top placers in each event advance to NLC. Two-day event with networking sessions and workshops.", location: "State Convention Center",
      category: "FBLA", startAt: new Date(now + day * 60 + hour * 8).toISOString(), attendeeIds: [], attendeeCount: 32, capacity: 150,
    },
    {
      id: "fb_19", schoolId, title: "National Leadership Conference", description: "The national FBLA competition — the biggest stage in high school business. Network with 12,000+ members from across the country.", location: "Atlanta, GA",
      category: "FBLA", startAt: new Date("2026-06-24T09:00:00.000Z").toISOString(), attendeeIds: [], attendeeCount: 12, capacity: 200,
    },
    {
      id: "fb_20", schoolId, title: "Chapter Practice Night", description: "Group practice session for all members competing this season. Run timed presentations, take practice tests, and get peer feedback.", location: "School Library, Room 204",
      category: "Academic", startAt: new Date(now + day * 4 + hour * 5).toISOString(), attendeeIds: [], attendeeCount: 15, capacity: 40,
    },
  ];
}

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

  const [localRsvp, setLocalRsvp] = useState<Record<string, boolean>>({});
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
    const fallback = buildFallbackEvents(profile.schoolId);

    const mergeWithFallback = (rows: EventItem[]) => {
      if (rows.length > 0) {
        const realIds = new Set(rows.map((r) => r.id));
        return [...rows, ...fallback.filter((fb) => !realIds.has(fb.id))];
      }
      return fallback;
    };

    const unsubscribe = subscribeEvents(
      profile.schoolId,
      (rows) => setEvents(mergeWithFallback(rows)),
      (error) => {
        console.warn("Events subscription failed:", error);
        setEvents(fallback);
      },
    );

    void fetchEventsOnce(profile.schoolId)
      .then((rows) => setEvents(mergeWithFallback(rows)))
      .catch((error) => {
        console.warn("Events bootstrap failed:", error);
        setEvents(fallback);
      })
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
      const fb = buildFallbackEvents(profile.schoolId);
      if (rows.length > 0) {
        const realIds = new Set(rows.map((r) => r.id));
        setEvents([...rows, ...fb.filter((f) => !realIds.has(f.id))]);
      } else {
        setEvents(fb);
      }
      await loadChapterData();
    } catch (error) {
      console.warn("Events refresh failed:", error);
      setEvents(buildFallbackEvents(profile.schoolId));
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
            <View style={{ marginTop: 8 }}>
              <GlassButton variant="solid" size="sm" fullWidth={false} label="Open Practice Area" onPress={() => navigation.navigate("Practice")} />
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
          const attendingFirestore = item.attendeeIds.includes(profile.uid);
          const attending = localRsvp[item.id] !== undefined ? localRsvp[item.id] : attendingFirestore;
          const coverUrl = (item as EventItem & { imageUrl?: string }).imageUrl
            || getEventImageByCategory(item.category, item.id);

          // Pick the right action label based on event category/title
          const title = item.title.toLowerCase();
          let primaryLabel = "RSVP";
          if (title.includes("interview") || title.includes("mock interview")) primaryLabel = "Schedule";
          else if (title.includes("workshop") || title.includes("bootcamp") || title.includes("session")) primaryLabel = "Register";
          else if (title.includes("conference") || title.includes("nlc") || title.includes("slc") || title.includes("dlc")) primaryLabel = "Register";
          else if (title.includes("social") || title.includes("game night") || title.includes("mixer") || title.includes("trivia")) primaryLabel = "Join";
          else if (title.includes("meeting")) primaryLabel = "Attend";
          const leaveLabel = title.includes("meeting") ? "Skip" : "Leave";

          // Attendee avatar cluster — pick up to 4 demo attendees
          const demoAttendeeIds = Object.keys(DEMO_ATTENDEE_AVATARS).slice(0, Math.min(4, (item.attendeeCount ?? 0)));
          const shownAvatars = demoAttendeeIds.map((id) => DEMO_ATTENDEE_AVATARS[id]).filter(Boolean);
          const overflowCount = Math.max(0, (item.attendeeCount ?? 0) - shownAvatars.length);

          return (
            <GlassSurface style={{ marginBottom: 12, overflow: "hidden", borderRadius: 16 }}>
              {/* Cover image with gradient overlay */}
              <View style={{ height: 150, borderRadius: 16, overflow: "hidden" }}>
                <Image
                  source={{ uri: coverUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  placeholder={DEFAULT_IMAGE_BLURHASH}
                  transition={300}
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.78)"]}
                  style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 100 }}
                />
                {/* Category badge */}
                <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: palette.colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{item.category ?? "FBLA"}</Text>
                </View>
                {/* Countdown badge */}
                <View style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(0,0,0,0.52)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>in {timeUntil(item.startAt)}</Text>
                </View>
                {/* Attendee avatar cluster — bottom right corner of image */}
                {shownAvatars.length > 0 ? (
                  <View style={{ position: "absolute", bottom: 36, right: 10, flexDirection: "row" }}>
                    {shownAvatars.map((av, i) => (
                      <View
                        key={av.name}
                        style={{
                          width: 26, height: 26, borderRadius: 13,
                          backgroundColor: av.color,
                          borderWidth: 2, borderColor: "rgba(0,0,0,0.6)",
                          alignItems: "center", justifyContent: "center",
                          marginLeft: i === 0 ? 0 : -8, zIndex: shownAvatars.length - i,
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{av.name.charAt(0)}</Text>
                      </View>
                    ))}
                    {overflowCount > 0 ? (
                      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.25)", borderWidth: 2, borderColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", marginLeft: -8 }}>
                        <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>+{overflowCount}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
                {/* Title over image */}
                <Text style={{ position: "absolute", bottom: 10, left: 12, right: 12, color: "#fff", fontWeight: "800", fontSize: 16 }} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>

              {/* Details below image */}
              <View style={{ padding: 12, gap: 4 }}>
                <Text style={{ color: palette.colors.textSecondary, fontSize: 13 }}>
                  {formatDateTime(item.startAt)}  ·  {item.location}
                </Text>
                {item.description ? (
                  <Text style={{ color: palette.colors.textMuted, fontSize: 12, lineHeight: 18 }} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  {item.attendeeCount > 0 ? (
                    <Text style={{ color: palette.colors.textMuted, fontSize: 12 }}>
                      {item.attendeeCount} going{item.capacity ? ` · ${Math.max(0, item.capacity - item.attendeeCount)} spots left` : ""}
                    </Text>
                  ) : <View />}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <GlassButton
                      variant={attending ? "ghost" : "solid"}
                      size="sm"
                      fullWidth={false}
                      label={attending ? leaveLabel : primaryLabel}
                      onPress={async () => {
                        hapticTap();
                        // Optimistic update immediately
                        setLocalRsvp((prev) => ({ ...prev, [item.id]: !attending }));
                        setEvents((prev) => prev.map((e) =>
                          e.id === item.id
                            ? { ...e, attendeeIds: attending ? e.attendeeIds.filter((id) => id !== profile.uid) : [...e.attendeeIds, profile.uid], attendeeCount: attending ? Math.max(0, e.attendeeCount - 1) : e.attendeeCount + 1 }
                            : e
                        ));
                        try {
                          await ensureEventInFirestore(item);
                          const result = await toggleEventAttendance(
                            { ...item, attendeeIds: attending ? item.attendeeIds.filter((id) => id !== profile.uid) : [...item.attendeeIds, profile.uid] },
                            profile,
                            { notifyEventReminder: settings.notifications.globalPush && settings.notifications.eventReminders },
                          );
                          handleAwardResult(result.award, { eventName: item.title });
                        } catch {
                          // revert on failure
                          setLocalRsvp((prev) => ({ ...prev, [item.id]: attending }));
                        }
                      }}
                    />
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      fullWidth={false}
                      label="Details"
                      onPress={() => navigation.navigate("EventDetail", { eventId: item.id })}
                    />
                  </View>
                </View>
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

