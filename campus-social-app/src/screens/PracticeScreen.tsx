import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { Search, Target } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { Text } from "react-native-paper";

import { Badge } from "../components/ui/badge";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassDropdown } from "../components/ui/GlassDropdown";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSegmentedControl } from "../components/ui/GlassSegmentedControl";
import { GlassSurface } from "../components/ui/GlassSurface";
import { MessageLoading } from "../components/ui/MessageLoading";
import { MagicCard, MagicCardRubric, MagicCardScore } from "../components/ui/MagicCard";
import {
  FBLA_EVENT_CATEGORY_FILTERS,
  FBLA_EVENT_DEFINITIONS,
  PracticeEventCategory,
} from "../constants/fblaEvents";
import { useAuthContext } from "../context/AuthContext";
import { useDashboard } from "../context/DashboardContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import {
  buildPracticeDashboardSummary,
  fetchPopularPracticeEventIds,
  recommendationFromSummary,
  subscribePracticeAttempts,
  subscribePracticeLeaderboard,
} from "../services/practiceService";
import { createStudySession, joinStudySession, subscribeStudySessions } from "../services/studySessionService";
import { PracticeAttempt, PracticeLeaderboardEntry } from "../types/practice";
import { ScreenShell } from "../components/ScreenShell";
import { formatRelativeTime } from "../utils/format";
import { StudySession } from "../types/features";

type PracticeTab = "events" | "dashboard" | "leaderboard";

function filterEvents(search: string, category: "All" | PracticeEventCategory) {
  const query = search.trim().toLowerCase();
  return FBLA_EVENT_DEFINITIONS.filter((event) => {
    if (category !== "All" && event.category !== category) {
      return false;
    }
    if (!query) {
      return true;
    }
    return (
      event.name.toLowerCase().includes(query) ||
      event.category.toLowerCase().includes(query) ||
      event.eventType.toLowerCase().includes(query)
    );
  });
}

function typeBadge(eventType: string): { variant: "blue-subtle" | "purple-subtle" | "teal-subtle" | "gray-subtle"; label: string } {
  switch (eventType) {
    case "team":
      return { variant: "purple-subtle", label: "Team" };
    case "presentation":
      return { variant: "blue-subtle", label: "Presentation" };
    case "objective_test":
      return { variant: "teal-subtle", label: "Objective Test" };
    case "role_play":
      return { variant: "blue-subtle", label: "Role Play" };
    case "report":
      return { variant: "purple-subtle", label: "Report" };
    default:
      return { variant: "gray-subtle", label: "Project" };
  }
}

export function PracticeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, isGuest } = useAuthContext();
  const { palette } = useThemeContext();
  const { layout } = useDashboard();

  const [tab, setTab] = useState<PracticeTab>("events");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"All" | PracticeEventCategory>("All");
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [leaderboard, setLeaderboard] = useState<PracticeLeaderboardEntry[]>([]);
  const [popularEventIds, setPopularEventIds] = useState<Set<string>>(new Set());
  const [loadingAttempts, setLoadingAttempts] = useState(true);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [sessionEventName, setSessionEventName] = useState("");
  const [sessionDescription, setSessionDescription] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    if (!profile) {
      setAttempts([]);
      setLoadingAttempts(false);
      return;
    }

    const unsubscribe = subscribePracticeAttempts(
      profile.uid,
      (rows) => {
        setAttempts(rows);
        setLoadingAttempts(false);
      },
      (error) => {
        console.warn("Practice attempts subscription failed:", error);
        setLoadingAttempts(false);
      },
    );

    return unsubscribe;
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.schoolId) {
      setLeaderboard([]);
      return;
    }

    const unsubscribe = subscribePracticeLeaderboard(
      profile.schoolId,
      (rows) => {
        setLeaderboard(rows);
      },
      (error) => {
        console.warn("Practice leaderboard subscription failed:", error);
      },
    );

    return unsubscribe;
  }, [profile?.schoolId]);

  useEffect(() => {
    if (!profile?.schoolId) {
      setStudySessions([]);
      return;
    }
    const unsubscribe = subscribeStudySessions(profile.schoolId, setStudySessions);
    return unsubscribe;
  }, [profile?.schoolId]);

  useEffect(() => {
    let active = true;
    const loadPopular = async () => {
      const ids = await fetchPopularPracticeEventIds(5);
      const fallbackIds =
        ids.length > 0
          ? ids
          : FBLA_EVENT_DEFINITIONS.filter((event) =>
              [
                "Business Law",
                "Public Speaking",
                "Entrepreneurship",
                "Marketing",
                "Coding & Programming",
              ].includes(event.name),
            ).map((event) => event.id);
      if (active) {
        setPopularEventIds(new Set(fallbackIds));
      }
    };
    void loadPopular();
    return () => {
      active = false;
    };
  }, []);

  const filteredEvents = useMemo(() => filterEvents(search, category), [search, category]);
  const hasAnyPractice = attempts.length > 0;
  const summary = useMemo(() => buildPracticeDashboardSummary(attempts), [attempts]);
  const readinessMap = useMemo(
    () => new Map(summary.eventStats.map((item) => [item.eventId, item.averageScore])),
    [summary.eventStats],
  );
  const recommended = useMemo(() => recommendationFromSummary(summary), [summary]);
  const tabOptions = useMemo(
    () => [
      { value: "events", label: "Events Browser" },
      { value: "dashboard", label: "My Dashboard" },
      { value: "leaderboard", label: "Leaderboard" },
    ],
    [],
  );
  const categoryOptions = useMemo(
    () =>
      FBLA_EVENT_CATEGORY_FILTERS.map((entry) => ({
        value: entry,
        label: entry,
        description: entry === "All" ? "All event categories" : `${entry} events`,
      })),
    [],
  );
  const eventNameOptions = useMemo(
    () =>
      FBLA_EVENT_DEFINITIONS.map((event) => ({
        value: event.name,
        label: event.name,
        description: event.category,
      })),
    [],
  );

  const selectedEventLookup = useMemo(() => {
    const set = new Set(layout.selectedCompetitiveEvents.map((name) => name.toLowerCase()));
    return set;
  }, [layout.selectedCompetitiveEvents]);

  if (!profile) {
    return (
      <ScreenShell title="Practice" subtitle="Loading your FBLA prep area...">
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <MessageLoading size="lg" />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="FBLA Practice"
      subtitle="AI tests, coaching, flashcards, and mock judging for every FBLA event."
      headerAddon={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Target size={18} color={palette.colors.primary} />
          <Pressable
            onPress={() => navigation.navigate("Events")}
            style={{
              minHeight: 36,
              minWidth: 72,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: palette.colors.border,
              paddingHorizontal: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              backgroundColor: palette.colors.surface,
            }}
            accessibilityRole="button"
            accessibilityLabel="Open Events"
          >
            <Feather name="calendar" size={14} color={palette.colors.text} />
            <Text style={{ color: palette.colors.text, fontWeight: "700", fontSize: 12 }}>
              Events
            </Text>
          </Pressable>
        </View>
      }
      refreshing={loadingAttempts}
      onRefresh={() => {
        setLoadingAttempts(true);
      }}
    >
      {isGuest ? (
        <GlassSurface
          elevation={2}
          style={{
            marginBottom: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: palette.colors.warning,
            backgroundColor: palette.colors.surfaceSoft,
          }}
        >
          <Text style={{ color: palette.colors.textSecondary }}>
            Guest mode: practice is read-only. Sign in to save scores, history, and leaderboard progress.
          </Text>
        </GlassSurface>
      ) : null}

      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: palette.colors.textSecondary, marginBottom: 6, fontWeight: "700", fontSize: 12 }}>
          Practice Section
        </Text>
        <GlassSegmentedControl
          value={tab}
          options={tabOptions}
          onValueChange={(nextValue) => {
            if (nextValue === "events" || nextValue === "dashboard" || nextValue === "leaderboard") {
              setTab(nextValue);
            }
          }}
        />
      </View>

      {tab === "events" ? (
        <>
          <MagicCardRubric style={{ marginBottom: 10 }}>
            <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 6 }}>
              Group Study Sessions
            </Text>
            {!isGuest ? (
              <>
                <GlassDropdown
                  label="Primary Event"
                  value={sessionEventName}
                  options={eventNameOptions}
                  searchable
                  onValueChange={(value) => setSessionEventName(value)}
                />
                <GlassInput
                  containerStyle={{ marginTop: 8 }}
                  value={sessionDescription}
                  onChangeText={setSessionDescription}
                  placeholder="What are you focusing on?"
                />
                <GlassButton
                  variant="solid"
                  size="sm"
                  label={creatingSession ? "Starting..." : "Start Study Session"}
                  style={{ marginTop: 8 }}
                  disabled={creatingSession || !sessionEventName.trim()}
                  onPress={async () => {
                    const event = FBLA_EVENT_DEFINITIONS.find((item) => item.name === sessionEventName);
                    if (!event || creatingSession) {
                      return;
                    }
                    setCreatingSession(true);
                    try {
                      const sessionId = await createStudySession(profile, {
                        eventIds: [event.id],
                        eventNames: [event.name],
                        description: sessionDescription.trim(),
                        maxParticipants: 8,
                        isChapterOnly: true,
                        mode: "practice_together",
                      });
                      setSessionDescription("");
                      navigation.navigate("StudySession", { sessionId });
                    } catch (error) {
                      console.warn("Create study session failed:", error);
                    } finally {
                      setCreatingSession(false);
                    }
                  }}
                />
              </>
            ) : (
              <Text style={{ color: palette.colors.textSecondary }}>
                Sign in to create chapter study sessions.
              </Text>
            )}

            <View style={{ marginTop: 10, gap: 8 }}>
              {studySessions.length === 0 ? (
                <Text style={{ color: palette.colors.textSecondary }}>No active sessions right now.</Text>
              ) : (
                studySessions.slice(0, 5).map((session) => {
                  const joined = session.participantIds.includes(profile.uid);
                  const isFull = session.participantIds.length >= session.maxParticipants;
                  return (
                    <GlassSurface key={session.id} style={{ padding: 10 }}>
                      <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                        {session.eventNames.join(", ") || "FBLA Study"}
                      </Text>
                      <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
                        {session.createdByName} • {session.participantIds.length}/{session.maxParticipants} members
                      </Text>
                      {session.description ? (
                        <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
                          {session.description}
                        </Text>
                      ) : null}
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                        <GlassButton
                          variant={joined ? "ghost" : "solid"}
                          size="sm"
                          label={joined ? "Open Session" : isFull ? "Session Full" : "Join Session"}
                          disabled={!joined && isFull}
                          onPress={async () => {
                            try {
                              if (!joined) {
                                await joinStudySession(session.id, profile);
                              }
                              navigation.navigate("StudySession", { sessionId: session.id });
                            } catch (error) {
                              console.warn("Join study session failed:", error);
                            }
                          }}
                        />
                      </View>
                    </GlassSurface>
                  );
                })
              )}
            </View>
          </MagicCardRubric>

          <GlassInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search FBLA events"
            leftSlot={<Search size={18} color={palette.colors.textSecondary} />}
            containerStyle={{ marginBottom: 10 }}
          />

          <GlassDropdown
            label="Category"
            value={category}
            options={categoryOptions}
            onValueChange={(nextValue) => {
              if (FBLA_EVENT_CATEGORY_FILTERS.includes(nextValue as "All" | PracticeEventCategory)) {
                setCategory(nextValue as "All" | PracticeEventCategory);
              }
            }}
            style={{ marginBottom: 10 }}
          />

          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={<EmptyState title="No matching events" message="Try another search or category." />}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => {
              const badgeMeta = typeBadge(item.eventType);
              const selected = selectedEventLookup.has(item.name.toLowerCase());
              const readiness = readinessMap.get(item.id);
              const isNew = typeof readiness !== "number";
              const isPopular = popularEventIds.has(item.id);
              const isRecommendedStart = !hasAnyPractice && item.name === "Business Law";

              return (
                <MagicCard
                  onPress={() => navigation.navigate("PracticeEventHub", { eventId: item.id })}
                  elevation={2}
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: selected ? palette.colors.primary : palette.colors.border,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.colors.text, fontWeight: "800", fontSize: 16 }}>
                        {item.name}
                      </Text>
                      <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
                        {item.category} • {item.teamEvent ? "Team" : "Individual"}
                      </Text>
                      <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
                        Readiness: {typeof readiness === "number" ? `${readiness}%` : "Not started"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <Badge variant={badgeMeta.variant} size="sm" capitalize={false}>
                        {badgeMeta.label}
                      </Badge>
                      {isNew ? (
                        <Badge variant="gray-subtle" size="sm" capitalize={false}>
                          New
                        </Badge>
                      ) : null}
                      {isPopular ? (
                        <Badge variant="amber-subtle" size="sm" capitalize={false}>
                          Popular
                        </Badge>
                      ) : null}
                      {isRecommendedStart ? (
                        <Badge variant="blue-subtle" size="sm" capitalize={false}>
                          Start here
                        </Badge>
                      ) : null}
                      {selected ? (
                        <Badge variant="green-subtle" size="sm" capitalize={false}>
                          Selected
                        </Badge>
                      ) : null}
                    </View>
                  </View>
                </MagicCard>
              );
            }}
          />
        </>
      ) : null}

      {tab === "dashboard" ? (
        <View style={{ gap: 10 }}>
          <MagicCardScore>
            <Text style={{ color: palette.colors.text, fontWeight: "800", fontSize: 16 }}>
              Overall Readiness
            </Text>
            <Text style={{ color: palette.colors.primary, fontWeight: "900", fontSize: 28, marginTop: 4 }}>
              {summary.overallReadiness}%
            </Text>
            <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
              {summary.totalSessions} sessions • {summary.streakDays} day practice streak
            </Text>
          </MagicCardScore>

          <MagicCardRubric>
            <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 6 }}>
              Weak Areas
            </Text>
            {summary.weakAreas.length === 0 ? (
              <Text style={{ color: palette.colors.textSecondary }}>
                Complete your first test to unlock personalized weak area analysis.
              </Text>
            ) : (
              summary.weakAreas.map((item) => (
                <View key={item.eventId} style={{ marginBottom: 8 }}>
                  <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                    {item.eventName}
                  </Text>
                  <Text style={{ color: palette.colors.textSecondary }}>
                    Avg {item.averageScore}% • Best {item.bestScore}% • {item.attempts} attempts
                  </Text>
                </View>
              ))
            )}
          </MagicCardRubric>

          <MagicCardRubric>
            <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 6 }}>
              Recommended Focus This Week
            </Text>
            {recommended.map((line) => (
              <Text key={line} style={{ color: palette.colors.textSecondary, marginBottom: 4 }}>
                • {line}
              </Text>
            ))}
          </MagicCardRubric>

          <MagicCardRubric>
            <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 6 }}>
              Event Progress
            </Text>
            {summary.eventStats.length === 0 ? (
              <Text style={{ color: palette.colors.textSecondary }}>
                No attempts yet.
              </Text>
            ) : (
              summary.eventStats.map((item) => (
                <View key={item.eventId} style={{ marginBottom: 8 }}>
                  <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                    {item.eventName}
                  </Text>
                  <Text style={{ color: palette.colors.textSecondary }}>
                    Best {item.bestScore}% • Avg {item.averageScore}% • Last {formatRelativeTime(item.lastPracticedAt)}
                  </Text>
                </View>
              ))
            )}
          </MagicCardRubric>
        </View>
      ) : null}

      {tab === "leaderboard" ? (
        <View style={{ gap: 8 }}>
          {leaderboard.length === 0 ? (
            <EmptyState
              title="No practice leaderboard yet"
              message="Take a few tests and scores will appear for your chapter."
            />
          ) : (
            leaderboard.map((row, index) => (
              <MagicCard
                key={row.uid}
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: row.uid === profile.uid ? palette.colors.primary : palette.colors.border,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.colors.text, fontWeight: "800" }}>
                      #{index + 1} {row.displayName}
                    </Text>
                    <Text style={{ color: palette.colors.textSecondary }}>
                      Avg {row.averageScore}% • {row.totalSessions} sessions • Improvement {row.improvementScore >= 0 ? "+" : ""}{row.improvementScore}
                    </Text>
                  </View>
                  {row.uid === profile.uid ? (
                    <Badge size="sm" variant="blue-subtle" capitalize={false}>
                      You
                    </Badge>
                  ) : null}
                </View>
              </MagicCard>
            ))
          )}
        </View>
      ) : null}
    </ScreenShell>
  );
}


