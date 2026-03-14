import { Plus } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenShell } from "../components/ScreenShell";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassCard } from "../components/ui/GlassCard";
import { GlassInput } from "../components/ui/GlassInput";
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
    <View style={{ flex: 1 }}>
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
              No {activeLevel} entries yet. Tap + to add one.
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

      {/* Spacer so content doesn't hide behind FAB */}
      <View style={{ height: 80 }} />
    </ScreenShell>

    {/* FAB — outside ScreenShell so it stays fixed on screen */}
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: oneHandedMode ? "flex-start" : "flex-end",
        paddingHorizontal: 20,
        paddingBottom: 24,
      }}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Add conference event"
        accessibilityHint="Opens form to add a new conference event"
        style={{
          width: 54,
          height: 54,
          borderRadius: 27,
          backgroundColor: palette.colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: palette.colors.primary,
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }}
      >
        <Plus size={22} color={palette.colors.onPrimary} />
      </Pressable>
    </View>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: palette.colors.overlay }}
          onPress={() => setSheetOpen(false)}
        />
        <KeyboardAvoidingView
          style={{
            maxHeight: "85%",
            backgroundColor: palette.colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: "hidden",
          }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Drag handle */}
          <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.colors.border }} />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: palette.colors.border,
            }}
          >
            <Pressable onPress={() => setSheetOpen(false)} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ color: palette.colors.primary, fontWeight: "700", fontSize: 15 }}>Cancel</Text>
            </Pressable>
            <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 17 }}>
              Add Event
            </Text>
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
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text
                style={{
                  color: eventName.trim() ? palette.colors.primary : palette.colors.muted,
                  fontWeight: "800",
                  fontSize: 15,
                }}
              >
                Save
              </Text>
            </Pressable>
          </View>

          {/* Form */}
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
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
                options={CONFERENCE_LEVELS.map((value) => ({ value, label: value }))}
              />
            </View>
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
            <GlassInput value={day} onChangeText={setDay} label="Day" placeholder="Day 1 / Monday" />
            <GlassInput value={time} onChangeText={setTime} label="Time" placeholder="09:30 AM" />
            <GlassInput value={location} onChangeText={setLocation} label="Location" placeholder="Room / Venue" />
            <GlassInput value={teammates} onChangeText={setTeammates} label="Teammates" placeholder="Comma separated names" />
            <GlassInput value={notes} onChangeText={setNotes} label="Notes" placeholder="Notes" multiline />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
