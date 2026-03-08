import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { Avatar, Button, Chip, Text } from "react-native-paper";

import { GlassSurface } from "../components/ui/GlassSurface";
import { useAuthContext } from "../context/AuthContext";
import { useGamification } from "../context/GamificationContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import { formatDateTime } from "../services/firestoreUtils";
import { hapticTap } from "../services/haptics";
import {
  fetchEventsOnce,
  fetchSchoolUsersOnce,
  toggleEventAttendance,
} from "../services/socialService";
import { EventItem, UserProfile } from "../types/social";

type Props = NativeStackScreenProps<RootStackParamList, "EventDetail">;

export function EventDetailScreen({ route, navigation }: Props) {
  const { eventId } = route.params;
  const { profile } = useAuthContext();
  const { handleAwardResult } = useGamification();
  const { palette } = useThemeContext();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const load = async () => {
      try {
        const [events, schoolUsers] = await Promise.all([
          fetchEventsOnce(profile.schoolId),
          fetchSchoolUsersOnce(profile.schoolId),
        ]);
        const target = events.find((item) => item.id === eventId) ?? null;
        setEvent(target);
        setUsers(schoolUsers);
        if (target) {
          navigation.setOptions({ title: target.title });
        }
      } catch (error) {
        console.warn("Event detail load failed:", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [eventId, profile?.schoolId]);

  const attendees = useMemo(() => {
    if (!event) {
      return [];
    }
    const lookup = new Map(users.map((user) => [user.uid, user]));
    return event.attendeeIds
      .map((id) => lookup.get(id))
      .filter((item): item is UserProfile => Boolean(item));
  }, [event, users]);

  if (!profile || loading || !event) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.colors.background }}>
        <Text>Loading event...</Text>
      </View>
    );
  }

  const attending = event.attendeeIds.includes(profile.uid);

  return (
    <View style={{ flex: 1, backgroundColor: palette.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Image
          source={event.coverImageUrl ?? "https://picsum.photos/900/500?random=604"}
          style={{ width: "100%", height: 230 }}
          contentFit="cover"
        />
        <View style={{ padding: 16 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "900", color: palette.colors.text }}>
            {event.title}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <Chip>{event.category ?? "FBLA"}</Chip>
            <Chip>{formatDateTime(event.startAt)}</Chip>
            <Chip>{event.location}</Chip>
          </View>
          <Text style={{ marginTop: 12, color: palette.colors.text, lineHeight: 22 }}>{event.description}</Text>

          <GlassSurface style={{ marginTop: 14, padding: 12 }}>
            <Text style={{ fontWeight: "800", marginBottom: 8, color: palette.colors.text }}>Who's Going</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {attendees.map((user) => (
                <Avatar.Image key={user.uid} size={36} source={{ uri: user.avatarUrl }} />
              ))}
              {attendees.length === 0 ? <Text style={{ color: palette.colors.muted }}>No attendees yet.</Text> : null}
            </View>
          </GlassSurface>
        </View>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: 16,
          backgroundColor: palette.colors.surface,
          borderTopWidth: 1,
          borderTopColor: palette.colors.border,
        }}
      >
        <Button
          mode={attending ? "outlined" : "contained"}
          onPress={async () => {
            hapticTap();
            try {
              const result = await toggleEventAttendance(event, profile);
              handleAwardResult(result.award, {
                eventName: event.title,
              });
              const events = await fetchEventsOnce(profile.schoolId);
              const updated = events.find((item) => item.id === event.id) ?? null;
              if (updated) {
                setEvent(updated);
              }
            } catch (error) {
              console.warn("Join event failed:", error);
            }
          }}
        >
          {attending ? "Leave Event" : "Join Event"}
        </Button>
      </View>
    </View>
  );
}
