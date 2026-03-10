import { Plus } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenShell } from "../components/ScreenShell";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassCard } from "../components/ui/GlassCard";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassPanel } from "../components/ui/GlassPanel";
import { GlassSegmentedControl } from "../components/ui/GlassSegmentedControl";
import { GlassSurface } from "../components/ui/GlassSurface";
import { JollySelect } from "../components/ui/JollySelect";
import { CONFERENCE_LEVELS, FBLA_COMPETITIVE_EVENTS } from "../constants/fblaEvents";
import { useAccessibility } from "../context/AccessibilityContext";
import { createConferenceEntryId, useDashboard } from "../context/DashboardContext";
import { useThemeContext } from "../context/ThemeContext";
import { hapticTap } from "../services/haptics";
import { ConferenceLevel } from "../types/fblaDashboard";
import { RootStackParamList } from "../navigation/types";

export function MyConferencesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { palette } = useThemeContext();
  const { oneHandedMode } = useAccessibility();
  const { layout, upsertConferenceEntry, deleteConferenceEntry } = useDashboard();
  const [activeLevel, setActiveLevel] = useState<ConferenceLevel>("DLC");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [eventName, setEventName] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [teammates, setTeammates] = useState("");

  const entries = useMemo(
    () => layout.conferenceSchedule.filter((entry) => entry.level === activeLevel),
    [activeLevel, layout.conferenceSchedule],
  );
  const showRoommateFinder = useMemo(() => {
    const raw = layout.conferenceDates[activeLevel];
    if (typeof raw !== "string" || raw.length === 0) {
      return false;
    }
    const target = Date.parse(raw);
    if (!Number.isFinite(target)) {
      return false;
    }
    const now = Date.now();
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 60;
  }, [activeLevel, layout.conferenceDates]);

  const resetForm = () => {
    setEventName("");
    setDay("");
    setTime("");
    setLocation("");
    setNotes("");
    setTeammates("");
  };

  return (
    <ScreenShell title="My Conferences" subtitle="Manage DLC, SLC, and NLC agendas and prep entries.">
      <View>
        <Text style={{ color: palette.colors.textSecondary, marginBottom: 6, fontWeight: "700", fontSize: 12 }}>
          Conference Level
        </Text>
        <GlassSegmentedControl
          value={activeLevel}
          onValueChange={(value) => {
            if (value === "DLC" || value === "SLC" || value === "NLC") {
              setActiveLevel(value);
            }
          }}
          options={CONFERENCE_LEVELS.map((value) => ({
            value,
            label: value,
          }))}
        />
        {showRoommateFinder ? (
          <GlassButton
            variant="ghost"
            size="sm"
            label="Find a Roommate"
            style={{ marginTop: 8, alignSelf: "flex-start" }}
            onPress={() => navigation.navigate("RoommateFinder", { level: activeLevel })}
          />
        ) : null}
      </View>

      <View style={{ marginTop: 12, gap: 10 }}>
        {entries.length === 0 ? (
          <GlassCard style={{ borderStyle: "dashed" }}>
            <Text style={{ color: palette.colors.textSecondary, textAlign: "center" }}>
              No {activeLevel} entries yet. Tap Add Event.
            </Text>
          </GlassCard>
        ) : null}

        {entries.map((entry) => (
          <GlassCard key={entry.id}>
            <Text style={{ color: palette.colors.text, fontWeight: "800" }}>{entry.eventName}</Text>
            <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
              {entry.day} • {entry.time} • {entry.location}
            </Text>
            {entry.notes ? (
              <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>{entry.notes}</Text>
            ) : null}
            {entry.teammateNames.length ? (
              <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
                Team: {entry.teammateNames.join(", ")}
              </Text>
            ) : null}
            <Pressable
              onPress={() => {
                hapticTap();
                void deleteConferenceEntry(entry.id);
              }}
              style={{ marginTop: 8, alignSelf: "flex-start" }}
            >
              <Text style={{ color: palette.colors.danger, fontWeight: "700" }}>Remove</Text>
            </Pressable>
          </GlassCard>
        ))}
      </View>

      <Pressable
        onPress={() => setSheetOpen(true)}
        style={{
          position: "absolute",
          right: oneHandedMode ? undefined : 18,
          left: oneHandedMode ? 18 : undefined,
          bottom: 28,
          minWidth: 54,
          minHeight: 54,
          borderRadius: 27,
          backgroundColor: palette.colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: palette.colors.primary,
          shadowOpacity: 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
        }}
      >
        <Plus size={20} color={palette.colors.onPrimary} />
      </Pressable>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <View style={{ flex: 1, backgroundColor: palette.colors.overlay, justifyContent: "flex-end" }}>
          <GlassPanel>
            <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 18 }}>
              Add Conference Event
            </Text>
            <ScrollView style={{ marginTop: 10 }}>
              <View style={{ marginBottom: 8 }}>
                <Text style={{ color: palette.colors.textSecondary, marginBottom: 6, fontWeight: "700", fontSize: 12 }}>
                  Conference Level
                </Text>
                <GlassSegmentedControl
                  value={activeLevel}
                  onValueChange={(value) => {
                    if (value === "DLC" || value === "SLC" || value === "NLC") {
                      setActiveLevel(value);
                    }
                  }}
                  options={CONFERENCE_LEVELS.map((value) => ({ value, label: value }))}
                />
              </View>
              <View style={{ marginTop: 8 }}>
                <JollySelect
                  label="Event Name"
                  value={eventName}
                  onValueChange={setEventName}
                  placeholder="Choose official event"
                  options={FBLA_COMPETITIVE_EVENTS.map((entry) => ({
                    label: entry,
                    value: entry,
                    section: "Official FBLA Events",
                  }))}
                />
              </View>
              <GlassInput
                value={day}
                onChangeText={setDay}
                label="Day"
                placeholder="Day 1 / Monday"
                containerStyle={{ marginTop: 8 }}
              />
              <GlassInput
                value={time}
                onChangeText={setTime}
                label="Time"
                placeholder="09:30 AM"
                containerStyle={{ marginTop: 8 }}
              />
              <GlassInput
                value={location}
                onChangeText={setLocation}
                label="Location"
                placeholder="Room / Venue"
                containerStyle={{ marginTop: 8 }}
              />
              <GlassInput
                value={teammates}
                onChangeText={setTeammates}
                label="Teammates"
                placeholder="Comma separated names"
                containerStyle={{ marginTop: 8 }}
              />
              <GlassInput
                value={notes}
                onChangeText={setNotes}
                label="Notes"
                placeholder="Notes"
                multiline
                containerStyle={{ marginTop: 8 }}
              />

              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Pressable onPress={() => setSheetOpen(false)} style={{ flex: 1 }}>
                  {({ pressed }) => (
                    <GlassSurface
                      pressed={pressed}
                      elevation={2}
                      borderRadius={12}
                      style={{
                        minHeight: 42,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: palette.colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: palette.colors.text, fontWeight: "700" }}>Cancel</Text>
                    </GlassSurface>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (!eventName.trim()) {
                      return;
                    }
                    const teammateNames = teammates
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean);
                    void upsertConferenceEntry({
                      id: createConferenceEntryId(activeLevel),
                      level: activeLevel,
                      eventName: eventName.trim(),
                      day: day.trim(),
                      time: time.trim(),
                      location: location.trim(),
                      notes: notes.trim(),
                      teammateNames,
                    });
                    resetForm();
                    setSheetOpen(false);
                  }}
                  style={{ flex: 1 }}
                >
                  {({ pressed }) => (
                    <GlassSurface
                      pressed={pressed}
                      tone="accent"
                      strong
                      elevation={3}
                      borderRadius={12}
                      style={{
                        minHeight: 42,
                        borderRadius: 12,
                        backgroundColor: palette.colors.primary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: palette.colors.onPrimary, fontWeight: "800" }}>
                        Save Event
                      </Text>
                    </GlassSurface>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </GlassPanel>
        </View>
      </Modal>
    </ScreenShell>
  );
}
