import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLogo } from "../components/branding/AppLogo";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassInput } from "../components/ui/GlassInput";
import { JollySelect } from "../components/ui/JollySelect";
import { GlassPill } from "../components/ui/GlassPill";
import { GlassSegmentedControl } from "../components/ui/GlassSegmentedControl";
import { GlassSurface } from "../components/ui/GlassSurface";
import { FBLA_COMPETITIVE_EVENTS } from "../constants/fblaEvents";
import { useDashboard } from "../context/DashboardContext";
import { useOnboarding } from "../context/OnboardingContext";
import { useThemeContext } from "../context/ThemeContext";
import { useAuthContext } from "../context/AuthContext";
import { setUserOnboardingCompleted, updateUserProfileFields } from "../services/userService";
import {
  Chapter,
  getChapterJoinRequestStatus,
  searchChapters,
  submitChapterJoinRequest,
} from "../services/chapterService";

export function OnboardingScreen() {
  const { completeOnboarding } = useOnboarding();
  const { palette } = useThemeContext();
  const { updateChapterProfile, setSelectedCompetitiveEvents, setConferenceDate } = useDashboard();
  const { uid, profile } = useAuthContext();

  const [step, setStep] = useState(0);
  const [chapterName, setChapterName] = useState("");
  const [chapterState, setChapterState] = useState("");
  const [officerRole, setOfficerRole] = useState("");
  const [profileType, setProfileType] = useState<"student" | "alumni">("student");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [dlcDate, setDlcDate] = useState("");
  const [slcDate, setSlcDate] = useState("");
  const [nlcDate, setNlcDate] = useState("");
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [chapterQuery, setChapterQuery] = useState("");
  const [chapterResults, setChapterResults] = useState<Chapter[]>([]);
  const [chapterSelected, setChapterSelected] = useState<Chapter | null>(null);
  const [chapterRequestStatus, setChapterRequestStatus] = useState<"pending" | "approved" | "denied" | null>(null);
  const [chapterBusy, setChapterBusy] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!chapterModalOpen) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await searchChapters(chapterQuery);
        if (!cancelled) {
          setChapterResults(rows);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Onboarding chapter search failed:", error);
          setChapterResults([]);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [chapterModalOpen, chapterQuery]);

  useEffect(() => {
    if (!profile?.uid || !chapterSelected?.id) {
      setChapterRequestStatus(null);
      return;
    }
    let cancelled = false;
    const loadStatus = async () => {
      try {
        const status = await getChapterJoinRequestStatus(chapterSelected.id, profile.uid);
        if (!cancelled) {
          setChapterRequestStatus(status);
        }
      } catch {
        if (!cancelled) {
          setChapterRequestStatus(null);
        }
      }
    };
    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [chapterSelected?.id, profile?.uid]);

  const completeSetup = async () => {
    if (completing) {
      return;
    }

    setCompleting(true);
    const resolvedChapterName = chapterName.trim() || chapterSelected?.name || profile?.chapterName || "FBLA Atlas Chapter";
    const resolvedChapterState = chapterState.trim() || chapterSelected?.state || profile?.state || "CA";
    const resolvedEvents = selectedEvents.length > 0 ? selectedEvents : profile?.competitiveEvents ?? [];

    console.log("[NavAction] Onboarding continue pressed", {
      step,
      resolvedChapterName,
      resolvedEventsCount: resolvedEvents.length,
    });

    try {
      try {
        await updateChapterProfile({
          chapterName: resolvedChapterName,
          chapterState: resolvedChapterState,
          officerRole: officerRole.trim(),
        });
      } catch (error) {
        console.warn("Onboarding chapter profile update failed:", error);
      }

      try {
        await setSelectedCompetitiveEvents(resolvedEvents);
      } catch (error) {
        console.warn("Onboarding event selection save failed:", error);
      }

      if (dlcDate.trim()) {
        try {
          await setConferenceDate("DLC", dlcDate.trim());
        } catch (error) {
          console.warn("Onboarding DLC date save failed:", error);
        }
      }
      if (slcDate.trim()) {
        try {
          await setConferenceDate("SLC", slcDate.trim());
        } catch (error) {
          console.warn("Onboarding SLC date save failed:", error);
        }
      }
      if (nlcDate.trim()) {
        try {
          await setConferenceDate("NLC", nlcDate.trim());
        } catch (error) {
          console.warn("Onboarding NLC date save failed:", error);
        }
      }

      if (uid) {
        try {
          await updateUserProfileFields(uid, {
            profileType,
            chapterName: resolvedChapterName,
            state: resolvedChapterState,
            competitiveEvents: resolvedEvents,
          });
        } catch (error) {
          console.warn("Onboarding profile field update failed:", error);
        }

        try {
          await setUserOnboardingCompleted(uid, true);
        } catch (error) {
          console.warn("Onboarding completion flag save failed:", error);
        }
      }

      await completeOnboarding();
      console.log("[NavAction] Onboarding complete -> Dashboard (AuthGate will mount MainTabs)");
    } catch (error) {
      console.error("Onboarding completion failed:", error);
      try {
        if (uid) {
          await setUserOnboardingCompleted(uid, true).catch(() => undefined);
        }
        await completeOnboarding();
        console.log("[NavAction] Onboarding fallback -> Dashboard");
      } catch (fallbackError) {
        console.error("Onboarding fallback completion failed:", fallbackError);
      }
    } finally {
      setCompleting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <AppLogo size={36} subtitle="Set up your FBLA dashboard" />
        <Text style={{ color: palette.colors.textSecondary, marginTop: 8 }}>
          Step {step + 1} of 5
        </Text>

        {step === 0 ? (
          <View style={{ marginTop: 14, gap: 10 }}>
            <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 22 }}>
              Welcome to FBLA Atlas
            </Text>
            <Text style={{ color: palette.colors.textSecondary }}>
              Setup takes under a minute. Your app uses one clean dark mode by default for best readability.
            </Text>
            <GlassSurface style={{ padding: 12, backgroundColor: palette.colors.surface }}>
              <Text style={{ color: palette.colors.textSecondary }}>
                You can still adjust text size and accessibility later in Settings.
              </Text>
            </GlassSurface>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ marginTop: 14, gap: 10 }}>
            <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 22 }}>
              Chapter Profile
            </Text>
            <GlassInput value={chapterName} onChangeText={setChapterName} label="Chapter Name" />
            <GlassInput value={chapterState} onChangeText={setChapterState} label="State" />
            <GlassInput value={officerRole} onChangeText={setOfficerRole} label="Officer Role (optional)" />
            <View style={{ marginTop: 4 }}>
              <Text style={{ color: palette.colors.textSecondary, marginBottom: 6, fontWeight: "700", fontSize: 12 }}>
                FBLA Profile Type
              </Text>
              <GlassSegmentedControl
                value={profileType}
                options={[
                  { value: "student", label: "Student" },
                  { value: "alumni", label: "Alumni" },
                ]}
                onValueChange={(value) => {
                  if (value === "student" || value === "alumni") {
                    setProfileType(value);
                  }
                }}
              />
            </View>
            <GlassButton
              variant="ghost"
              label="Join Existing Chapter"
              onPress={() => setChapterModalOpen(true)}
            />
            {chapterSelected ? (
              <Text style={{ color: palette.colors.textSecondary }}>
                Selected: {chapterSelected.name} ({chapterSelected.state})
              </Text>
            ) : null}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ marginTop: 14, gap: 10 }}>
            <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 22 }}>
              Add Competitive Events
            </Text>
            <JollySelect
              label="Official FBLA Event"
              value={selectedEvent}
              onValueChange={setSelectedEvent}
              options={FBLA_COMPETITIVE_EVENTS.map((eventName) => ({ label: eventName, value: eventName, section: "Official Event List" }))}
            />
            <GlassButton
              variant="solid"
              label="Add Event"
              onPress={() => {
                if (!selectedEvent || selectedEvents.includes(selectedEvent)) {
                  return;
                }
                setSelectedEvents((prev) => [...prev, selectedEvent]);
                setSelectedEvent("");
              }}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {selectedEvents.map((eventName, index) => (
                <GlassPill
                  key={`${eventName}-${index}`}
                  label={`${eventName} ×`}
                  onPress={() => setSelectedEvents((prev) => prev.filter((item) => item !== eventName))}
                  selected
                />
              ))}
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={{ marginTop: 14, gap: 10 }}>
            <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 22 }}>
              Set Conference Dates
            </Text>
            <Text style={{ color: palette.colors.textSecondary }}>
              Use ISO format: `YYYY-MM-DDTHH:mm`
            </Text>
            <GlassInput value={dlcDate} onChangeText={setDlcDate} label="DLC Date" placeholder="2026-11-14T09:00" />
            <GlassInput value={slcDate} onChangeText={setSlcDate} label="SLC Date" placeholder="2027-03-08T09:00" />
            <GlassInput value={nlcDate} onChangeText={setNlcDate} label="NLC Date" placeholder="2027-06-26T09:00" />
          </View>
        ) : null}

        {step === 4 ? (
          <View style={{ marginTop: 14, gap: 10 }}>
            <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 22 }}>
              You Are Ready
            </Text>
            <Text style={{ color: palette.colors.textSecondary }}>
              Home is now a simple FBLA dashboard with quick actions, chapter snapshot, and latest feed.
            </Text>
            <Text style={{ color: palette.colors.textSecondary }}>
              Open Practice, Conferences, and Leaderboard from Home whenever you need them.
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
          {step > 0 ? (
            <GlassButton
              variant="ghost"
              label="Back"
              style={{ flex: 1 }}
              onPress={() => setStep((prev) => Math.max(0, prev - 1))}
            />
          ) : null}
          {step < 4 ? (
            <GlassButton
              variant="solid"
              label="Next"
              style={{ flex: 1 }}
              onPress={() => setStep((prev) => Math.min(4, prev + 1))}
            />
          ) : (
            <GlassButton
              variant="solid"
              label="Launch FBLA Dashboard"
              style={{ flex: 1 }}
              disabled={completing}
              loading={completing}
              onPress={() => void completeSetup()}
            />
          )}
        </View>
      </ScrollView>

      <Modal visible={chapterModalOpen} animationType="slide" onRequestClose={() => setChapterModalOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Text style={{ color: palette.colors.text, fontWeight: "700", fontSize: 22 }}>
              Join Chapter
            </Text>
            <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
              Search by school or chapter name, then send a join request.
            </Text>
            <GlassSurface style={{ marginTop: 12, padding: 16 }}>
              <GlassInput
                label="Search"
                placeholder="Type school or chapter"
                value={chapterQuery}
                onChangeText={setChapterQuery}
              />
            </GlassSurface>
            <GlassSurface style={{ marginTop: 12, padding: 16 }}>
              {chapterResults.length === 0 ? (
                <Text style={{ color: palette.colors.textSecondary }}>No chapters found.</Text>
              ) : (
                chapterResults.map((chapter) => (
                  <Pressable
                    key={chapter.id}
                    onPress={() => {
                      setChapterSelected(chapter);
                      setChapterName(chapter.name);
                      setChapterState(chapter.state);
                    }}
                    style={{ marginBottom: 8 }}
                  >
                    {({ pressed }) => (
                      <GlassSurface
                        pressed={pressed}
                        style={{
                          padding: 10,
                          borderColor:
                            chapterSelected?.id === chapter.id ? palette.colors.primary : palette.colors.border,
                        }}
                      >
                        <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{chapter.name}</Text>
                        <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>
                          {chapter.school} • {chapter.city}, {chapter.state}
                        </Text>
                        <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>
                          Members: {chapter.memberCount}
                        </Text>
                      </GlassSurface>
                    )}
                  </Pressable>
                ))
              )}
            </GlassSurface>
            {chapterSelected ? (
              <GlassSurface style={{ marginTop: 12, padding: 16 }}>
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{chapterSelected.name}</Text>
                <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
                  {chapterSelected.school} • {chapterSelected.city}, {chapterSelected.state}
                </Text>
                <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
                  Members: {chapterSelected.memberCount}
                </Text>
                <Text
                  style={{
                    color: palette.colors.textSecondary,
                    marginTop: 16,
                    marginBottom: 8,
                    fontSize: 13,
                    fontWeight: "600",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                  }}
                >
                  Officers
                </Text>
                {chapterSelected.officers.map((officer, index) => (
                  <Text key={`${officer}-${index}`} style={{ color: palette.colors.text, marginBottom: 4 }}>
                    {officer}
                  </Text>
                ))}
                <GlassButton
                  variant="solid"
                  label={
                    chapterRequestStatus === "pending"
                      ? "Request Sent"
                      : chapterRequestStatus === "approved"
                        ? "Joined"
                        : "Request to Join"
                  }
                  disabled={chapterRequestStatus === "pending" || chapterRequestStatus === "approved" || chapterBusy}
                  loading={chapterBusy}
                  style={{ marginTop: 12 }}
                  onPress={async () => {
                    if (!profile) {
                      return;
                    }
                    try {
                      setChapterBusy(true);
                      await submitChapterJoinRequest(chapterSelected, profile);
                      setChapterRequestStatus("pending");
                    } catch (error) {
                      console.warn("Onboarding chapter request failed:", error);
                    } finally {
                      setChapterBusy(false);
                    }
                  }}
                />
              </GlassSurface>
            ) : null}
            <GlassButton
              variant="ghost"
              label="Done"
              style={{ marginTop: 12 }}
              onPress={() => setChapterModalOpen(false)}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}


