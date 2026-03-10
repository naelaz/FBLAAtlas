import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSurface } from "../components/ui/GlassSurface";
import { useAuthContext } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import {
  createRoommateMatch,
  fetchRoommatePreference,
  saveRoommatePreference,
  subscribeRoommateProfiles,
} from "../services/roommateService";
import { RoommatePreference } from "../types/features";

type Props = NativeStackScreenProps<RootStackParamList, "RoommateFinder">;

export function RoommateFinderScreen({ route, navigation }: Props) {
  const { level } = route.params;
  const { profile } = useAuthContext();
  const [sleepSchedule, setSleepSchedule] = useState("");
  const [noiseLevel, setNoiseLevel] = useState("");
  const [tidiness, setTidiness] = useState("");
  const [studyPreference, setStudyPreference] = useState("");
  const [genderPreference, setGenderPreference] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<RoommatePreference[]>([]);

  useEffect(() => {
    if (!profile?.chapterId) {
      return;
    }
    const unsubscribe = subscribeRoommateProfiles(profile.chapterId, level, setRows);
    return unsubscribe;
  }, [level, profile?.chapterId]);

  useEffect(() => {
    if (!profile) {
      return;
    }
    void fetchRoommatePreference(profile.uid).then((row) => {
      if (!row) {
        return;
      }
      setSleepSchedule(row.sleepSchedule);
      setNoiseLevel(row.noiseLevel);
      setTidiness(row.tidiness);
      setStudyPreference(row.studyPreference);
      setGenderPreference(row.genderPreference);
      setNote(row.note);
    });
  }, [profile?.uid]);

  const candidates = useMemo(
    () => rows.filter((row) => row.uid !== profile?.uid),
    [profile?.uid, rows],
  );

  if (!profile) {
    return null;
  }

  return (
    <ScreenShell
      title="Roommate Finder"
      subtitle={`${level} preference matching`}
      showBackButton
      onBackPress={() => navigation.goBack()}
    >
      <GlassSurface style={{ padding: 12 }}>
        <GlassInput label="Sleep Schedule" value={sleepSchedule} onChangeText={setSleepSchedule} placeholder="Early / Late" />
        <GlassInput containerStyle={{ marginTop: 8 }} label="Noise Level" value={noiseLevel} onChangeText={setNoiseLevel} placeholder="Quiet / Moderate / Okay with noise" />
        <GlassInput containerStyle={{ marginTop: 8 }} label="Tidiness" value={tidiness} onChangeText={setTidiness} placeholder="Very tidy / flexible" />
        <GlassInput containerStyle={{ marginTop: 8 }} label="Study in Room" value={studyPreference} onChangeText={setStudyPreference} placeholder="Yes / No / Sometimes" />
        <GlassInput containerStyle={{ marginTop: 8 }} label="Gender Preference" value={genderPreference} onChangeText={setGenderPreference} placeholder="No preference / ..." />
        <GlassInput containerStyle={{ marginTop: 8 }} label="Note" value={note} onChangeText={setNote} placeholder="Anything else roommates should know?" multiline />
        <GlassButton
          variant="solid"
          label="Save Preferences"
          style={{ marginTop: 10 }}
          onPress={async () => {
            await saveRoommatePreference({
              uid: profile.uid,
              chapterId: profile.chapterId ?? "",
              conferenceLevel: level,
              sleepSchedule: sleepSchedule.trim(),
              noiseLevel: noiseLevel.trim(),
              tidiness: tidiness.trim(),
              studyPreference: studyPreference.trim(),
              genderPreference: genderPreference.trim(),
              note: note.trim(),
              createdAt: new Date().toISOString(),
            });
          }}
        />
      </GlassSurface>

      <Text style={{ marginTop: 12, fontWeight: "700" }}>Matching Members</Text>
      <ScrollView style={{ marginTop: 8 }}>
        {candidates.map((row) => (
          <GlassSurface key={row.uid} style={{ padding: 10, marginBottom: 8 }}>
            <Text style={{ fontWeight: "700" }}>{row.uid.slice(0, 8)}</Text>
            <Text>{row.sleepSchedule} • {row.noiseLevel} • {row.tidiness}</Text>
            <Text>{row.studyPreference}</Text>
            {row.note ? <Text>{row.note}</Text> : null}
            <Pressable
              onPress={async () => {
                await createRoommateMatch(level, profile.uid, row.uid);
              }}
              style={{ marginTop: 8 }}
            >
              <GlassSurface style={{ minHeight: 38, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontWeight: "700" }}>Match</Text>
              </GlassSurface>
            </Pressable>
          </GlassSurface>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

