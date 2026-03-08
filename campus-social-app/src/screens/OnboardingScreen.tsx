import React, { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLogo } from "../components/branding/AppLogo";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassInput } from "../components/ui/GlassInput";
import { JollySelect } from "../components/ui/JollySelect";
import { GlassPill } from "../components/ui/GlassPill";
import { GlassSurface } from "../components/ui/GlassSurface";
import { FBLA_COMPETITIVE_EVENTS } from "../constants/fblaEvents";
import { useDashboard } from "../context/DashboardContext";
import { useOnboarding } from "../context/OnboardingContext";
import { useThemeContext } from "../context/ThemeContext";
import { useAuthContext } from "../context/AuthContext";
import { setUserOnboardingCompleted } from "../services/userService";

export function OnboardingScreen() {
  const { completeOnboarding } = useOnboarding();
  const { palette } = useThemeContext();
  const { updateChapterProfile, setSelectedCompetitiveEvents, setConferenceDate } = useDashboard();
  const { uid } = useAuthContext();

  const [step, setStep] = useState(0);
  const [chapterName, setChapterName] = useState("");
  const [chapterState, setChapterState] = useState("");
  const [officerRole, setOfficerRole] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [dlcDate, setDlcDate] = useState("");
  const [slcDate, setSlcDate] = useState("");
  const [nlcDate, setNlcDate] = useState("");

  const doneDisabled = useMemo(
    () => !selectedEvents.length || !chapterName.trim(),
    [selectedEvents.length, chapterName],
  );

  const completeSetup = async () => {
    await updateChapterProfile({
      chapterName: chapterName.trim(),
      chapterState: chapterState.trim(),
      officerRole: officerRole.trim(),
    });
    await setSelectedCompetitiveEvents(selectedEvents);
    if (dlcDate.trim()) {
      await setConferenceDate("DLC", dlcDate.trim());
    }
    if (slcDate.trim()) {
      await setConferenceDate("SLC", slcDate.trim());
    }
    if (nlcDate.trim()) {
      await setConferenceDate("NLC", nlcDate.trim());
    }
    if (uid) {
      await setUserOnboardingCompleted(uid, true);
    }
    await completeOnboarding();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <AppLogo subtitle="Set up your FBLA dashboard" />
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
              disabled={doneDisabled}
              onPress={() => void completeSetup()}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

