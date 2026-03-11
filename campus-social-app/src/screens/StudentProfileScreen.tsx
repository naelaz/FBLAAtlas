import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MessageCircle, UserCheck, UserPlus } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { Badge } from "../components/ui/badge";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassSurface } from "../components/ui/GlassSurface";
import { TierBadge } from "../components/ui/TierBadge";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import { formatRelativeDateTime } from "../services/firestoreUtils";
import { hapticTap } from "../services/haptics";
import { createOrGetConversation } from "../services/messagingService";
import {
  fetchRecentActivityForUser,
  fetchSchoolUsersOnce,
  toggleFollowUser,
} from "../services/socialService";
import { ActivityItem, UserProfile } from "../types/social";
import { formatCompactNumber } from "../utils/format";

type Props = NativeStackScreenProps<RootStackParamList, "StudentProfile">;

export function StudentProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const { profile } = useAuthContext();
  const { palette } = useThemeContext();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      try {
        const users = await fetchSchoolUsersOnce(profile.schoolId);
        const target = users.find((item) => item.uid === userId) ?? null;
        setUser(target);
        if (target) {
          navigation.setOptions({ title: target.displayName });
          setIsFollowing(profile.followingIds?.includes(target.uid) ?? false);
          const nextActivity = await fetchRecentActivityForUser(target.schoolId, target.uid);
          setActivity(nextActivity);
        }
      } catch (error) {
        console.warn("Student profile load failed:", error);
      }
    };
    void load();
  }, [userId, navigation, profile?.schoolId]);

  const handleFollow = async () => {
    if (!profile || !user) return;
    setFollowLoading(true);
    hapticTap();
    setIsFollowing((prev) => !prev);
    try {
      await toggleFollowUser(profile, user);
    } catch {
      setIsFollowing((prev) => !prev);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!profile || !user) return;
    setMessageLoading(true);
    hapticTap();
    try {
      const conversation = await createOrGetConversation(profile, user);
      navigation.navigate("Chat", {
        conversationId: conversation.conversationId,
        targetUserId: user.uid,
      });
    } catch (error) {
      console.warn("Start conversation failed:", error);
    } finally {
      setMessageLoading(false);
    }
  };

  if (!user) {
    return (
      <ScreenShell title="Profile" subtitle="Loading profile...">
        <EmptyState title="Loading" message="Fetching student profile..." />
      </ScreenShell>
    );
  }

  const isOwnProfile = profile?.uid === user.uid;

  const canViewFullProfile = (() => {
    if (!profile || isOwnProfile) return true;
    const visibility = user.profileVisibility ?? "public";
    if (visibility === "public") return true;
    if (visibility === "school") {
      if (profile.chapterId && user.chapterId) return profile.chapterId === user.chapterId;
      return profile.schoolId === user.schoolId;
    }
    return user.followerIds.includes(profile.uid);
  })();

  if (!canViewFullProfile) {
    return (
      <ScreenShell title={user.displayName} subtitle="Profile visibility is restricted for this account.">
        <GlassSurface style={{ marginBottom: 12, padding: 14 }}>
          <View style={{ alignItems: "center", gap: 10 }}>
            <AvatarWithStatus uri={user.avatarUrl} seed={user.displayName} size={84} online={false} tier={user.tier} avatarColor={user.avatarColor || undefined} />
            <Text variant="titleMedium" style={{ fontWeight: "800", color: palette.colors.text }}>
              {user.displayName}
            </Text>
            <Text style={{ color: palette.colors.textSecondary, textAlign: "center" }}>
              This profile is private. Follow this member to view full details.
            </Text>
            {!isOwnProfile ? (
              <GlassButton
                variant="solid"
                size="sm"
                fullWidth={false}
                label={isFollowing ? "Following" : "Follow"}
                icon={isFollowing ? <UserCheck size={14} color="#fff" /> : <UserPlus size={14} color="#fff" />}
                loading={followLoading}
                onPress={() => void handleFollow()}
              />
            ) : null}
          </View>
        </GlassSurface>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={user.displayName} subtitle={`${user.schoolName} • Class of ${user.graduationYear}`}>
      {/* Hero card */}
      <GlassSurface style={{ marginBottom: 12, padding: 14 }}>
        <View style={{ alignItems: "center", gap: 8 }}>
          <AvatarWithStatus uri={user.avatarUrl} seed={user.displayName} size={84} online tier={user.tier} avatarColor={user.avatarColor || undefined} />
          <Text variant="titleLarge" style={{ fontWeight: "900", color: palette.colors.text }}>
            {user.displayName}
          </Text>

          {/* Position pill — always shown */}
          <View style={{
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: user.officerPosition ? `${palette.colors.primary}22` : `${palette.colors.textMuted}18`,
            borderWidth: 1,
            borderColor: user.officerPosition ? `${palette.colors.primary}66` : palette.colors.border,
          }}>
            <Text style={{ color: user.officerPosition ? palette.colors.primary : palette.colors.textSecondary, fontWeight: "700", fontSize: 13 }}>
              {user.officerPosition
                ? user.officerPosition
                : user.primaryEvent
                ? `Competing in ${user.primaryEvent}`
                : user.competitiveEvents && user.competitiveEvents.length > 0
                ? `${user.competitiveEvents[0]} Competitor`
                : user.grade
                ? `Grade ${user.grade} · FBLA Member`
                : "Future Business Leader"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <TierBadge tier={user.tier} />
            <Badge variant="blue-subtle" size="sm" capitalize={false}>
              {formatCompactNumber(user.xp)} XP
            </Badge>
            <Badge variant="gray-subtle" size="sm" capitalize={false}>
              Class of {user.graduationYear}
            </Badge>
            <Badge variant="amber-subtle" size="sm" capitalize={false}>
              {user.streakCount} day streak
            </Badge>
          </View>

          {user.bio ? (
            <Text style={{ color: palette.colors.textSecondary, textAlign: "center", fontSize: 13, lineHeight: 18 }}>
              {user.bio}
            </Text>
          ) : null}

          {/* Action buttons — only for other users */}
          {!isOwnProfile ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <GlassButton
                variant={isFollowing ? "ghost" : "solid"}
                size="sm"
                fullWidth={false}
                label={isFollowing ? "Following" : "Follow"}
                icon={isFollowing
                  ? <UserCheck size={14} color={palette.colors.textSecondary} />
                  : <UserPlus size={14} color="#fff" />}
                loading={followLoading}
                onPress={() => void handleFollow()}
              />
              <GlassButton
                variant="ghost"
                size="sm"
                fullWidth={false}
                label="Message"
                icon={<MessageCircle size={14} color={palette.colors.text} />}
                loading={messageLoading}
                onPress={() => void handleMessage()}
              />
            </View>
          ) : null}
        </View>
      </GlassSurface>

      {/* Badges */}
      <GlassSurface style={{ marginBottom: 12, padding: 12 }}>
        <Text style={{ color: palette.colors.textMuted, fontWeight: "800", fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
          Badges
        </Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {user.badges.length > 0 ? (
            user.badges.map((badge, index) => (
              <Badge key={`${badge}-${index}`} variant="gray-subtle" size="sm" capitalize={false}>
                {badge}
              </Badge>
            ))
          ) : (
            <Text style={{ color: palette.colors.textSecondary }}>No badges yet.</Text>
          )}
        </View>
      </GlassSurface>

      {/* Recent Activity */}
      <GlassSurface style={{ padding: 12 }}>
        <Text style={{ color: palette.colors.textMuted, fontWeight: "800", fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
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
              <Text style={{ color: palette.colors.text }}>{item.message}</Text>
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
