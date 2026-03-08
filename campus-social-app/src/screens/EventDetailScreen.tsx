import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackButton } from "../components/navigation/BackButton";
import { AppImage } from "../components/media/AppImage";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { Badge } from "../components/ui/badge";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassSurface } from "../components/ui/GlassSurface";
import { getEventImageByCategory } from "../constants/media";
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
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }} edges={["top", "left", "right"]}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingTop: 4 }}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text variant="titleMedium" style={{ color: palette.colors.text, fontWeight: "800" }}>
            Event
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const attending = event.attendeeIds.includes(profile.uid);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }} edges={["top", "left", "right"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingTop: 4 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{ color: palette.colors.text, fontWeight: "800" }}>
          Event
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={{ width: "100%", aspectRatio: 16 / 9, minHeight: 280 }}>
            <AppImage
              uri={event.coverImageUrl ?? getEventImageByCategory(event.category, event.id)}
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <LinearGradient
              colors={[palette.colors.transparent, palette.colors.imageOverlayStrong]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
            />
          </View>
          <View style={{ padding: 16 }}>
            <Text variant="headlineSmall" style={{ fontWeight: "900", color: palette.colors.text }}>
              {event.title}
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <Badge size="sm" variant="purple-subtle" capitalize={false}>
                {event.category ?? "FBLA"}
              </Badge>
              <Badge size="sm" variant="gray-subtle" capitalize={false}>
                {formatDateTime(event.startAt)}
              </Badge>
              <Badge size="sm" variant="teal-subtle" capitalize={false}>
                {event.location}
              </Badge>
            </View>
            <Text style={{ marginTop: 12, color: palette.colors.text, lineHeight: 22 }}>{event.description}</Text>

            <GlassSurface style={{ marginTop: 14, padding: 12 }}>
              <Text style={{ fontWeight: "800", marginBottom: 8, color: palette.colors.text }}>Who's Going</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {attendees.map((user) => (
                  <AvatarWithStatus key={user.uid} uri={user.avatarUrl} size={36} online={false} />
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
          <GlassButton
            variant={attending ? "ghost" : "solid"}
            label={attending ? "Leave Event" : "Join Event"}
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
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
