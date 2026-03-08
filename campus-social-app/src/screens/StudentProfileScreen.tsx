import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { Badge, getTierBadgeVariant } from "../components/ui/badge";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassSurface } from "../components/ui/GlassSurface";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import { formatRelativeDateTime } from "../services/firestoreUtils";
import { fetchRecentActivityForUser, fetchSchoolUsersOnce } from "../services/socialService";
import { ActivityItem, UserProfile } from "../types/social";
import { formatCompactNumber } from "../utils/format";

type Props = NativeStackScreenProps<RootStackParamList, "StudentProfile">;

export function StudentProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const { profile } = useAuthContext();
  const { palette } = useThemeContext();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!profile) {
      return;
    }
    const load = async () => {
      try {
        const users = await fetchSchoolUsersOnce(profile.schoolId);
        const target = users.find((item) => item.uid === userId) ?? null;
        setUser(target);
        if (target) {
          navigation.setOptions({ title: target.displayName });
          const nextActivity = await fetchRecentActivityForUser(target.schoolId, target.uid);
          setActivity(nextActivity);
        }
      } catch (error) {
        console.warn("Student profile load failed:", error);
      }
    };
    void load();
  }, [userId, navigation, profile?.schoolId]);

  if (!user) {
    return (
      <ScreenShell title="Profile" subtitle="Loading profile...">
        <EmptyState title="Loading" message="Fetching student profile..." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={user.displayName} subtitle={`${user.schoolName} • Class of ${user.graduationYear}`}>
      <GlassSurface style={{ marginBottom: 12, padding: 14 }}>
        <View style={{ alignItems: "center", gap: 8 }}>
          <AvatarWithStatus uri={user.avatarUrl} size={84} online />
          <Text variant="titleLarge" style={{ fontWeight: "900" }}>
            {user.displayName}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <Badge variant={getTierBadgeVariant(user.tier)} size="sm" capitalize={false}>
              {user.tier}
            </Badge>
            <Badge variant="blue-subtle" size="sm" capitalize={false}>
              {formatCompactNumber(user.xp)} XP
            </Badge>
            <Badge variant="gray-subtle" size="sm" capitalize={false}>
              Class of {user.graduationYear}
            </Badge>
            <Badge variant="amber-subtle" size="sm" capitalize={false}>
              🔥 {user.streakCount} day streak
            </Badge>
          </View>
          <Text>{user.bio || "No bio yet."}</Text>
        </View>
      </GlassSurface>

      <GlassSurface style={{ marginBottom: 12, padding: 12 }}>
        <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>
          Badges
        </Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {user.badges.length > 0 ? (
            user.badges.map((badge) => (
              <Badge key={badge} variant={getTierBadgeVariant(user.tier)} size="sm" capitalize={false}>
                {badge}
              </Badge>
            ))
          ) : (
            <Text>No badges yet.</Text>
          )}
        </View>
      </GlassSurface>

      <GlassSurface style={{ padding: 12 }}>
        <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>
          Recent Activity
        </Text>
        {activity.length > 0 ? (
          activity.map((item) => (
            <View
              key={item.id}
              style={{
                borderBottomWidth: 1,
                borderBottomColor: palette.colors.border,
                paddingBottom: 8,
                marginBottom: 8,
              }}
            >
              <Text>{item.message}</Text>
              <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>
                {formatRelativeDateTime(item.createdAt)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ color: palette.colors.textSecondary }}>No recent activity found.</Text>
        )}
      </GlassSurface>
    </ScreenShell>
  );
}
