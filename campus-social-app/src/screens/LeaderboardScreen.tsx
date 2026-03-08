import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassSurface } from "../components/ui/GlassSurface";
import { TIER_COLORS } from "../constants/themes";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { fetchLeaderboardOnce, subscribeLeaderboard } from "../services/socialService";
import { UserProfile } from "../types/social";
import { formatCompactNumber } from "../utils/format";

type PodiumTheme = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tierColor: keyof typeof TIER_COLORS;
};

const PODIUM: PodiumTheme[] = [
  { icon: "crown", tierColor: "Gold" },
  { icon: "medal", tierColor: "Silver" },
  { icon: "star-circle", tierColor: "Bronze" },
];

function PodiumCard({
  user,
  theme,
  textColor,
  mutedColor,
}: {
  user: UserProfile;
  theme: PodiumTheme;
  textColor: string;
  mutedColor: string;
}) {
  const accent = TIER_COLORS[theme.tierColor];

  return (
    <GlassSurface
      style={{
        padding: 12,
        borderColor: accent,
        backgroundColor: "transparent",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <AvatarWithStatus uri={user.avatarUrl} size={46} online />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "900", color: textColor }}>{user.displayName}</Text>
          <Text style={{ color: mutedColor }}>
            {user.tier} • {formatCompactNumber(user.xp)} XP
          </Text>
        </View>
        <MaterialCommunityIcons name={theme.icon} size={22} color={accent} />
      </View>
    </GlassSurface>
  );
}

export function LeaderboardScreen() {
  const { profile } = useAuthContext();
  const { palette } = useThemeContext();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const unsubscribe = subscribeLeaderboard(
      profile.schoolId,
      setUsers,
      (error) => {
        console.warn("Leaderboard subscription failed:", error);
      },
    );
    return unsubscribe;
  }, [profile?.schoolId]);

  const refresh = async () => {
    if (!profile) {
      return;
    }

    setRefreshing(true);
    try {
      const next = await fetchLeaderboardOnce(profile.schoolId);
      setUsers(next);
    } catch (error) {
      console.warn("Leaderboard refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const topThree = users.slice(0, 3);
  const rest = users.slice(3, 10);
  const myRank = useMemo(() => {
    if (!profile) {
      return null;
    }
    const index = users.findIndex((item) => item.uid === profile.uid);
    if (index === -1) {
      return null;
    }
    return {
      rank: index + 1,
      user: users[index],
    };
  }, [profile, users]);

  return (
    <ScreenShell
      title="Leaderboard"
      subtitle="Top students ranked by XP."
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    >
      {users.length === 0 ? (
        <EmptyState title="No Leaderboard Data" message="Pull to refresh after users start earning XP." />
      ) : (
        <View style={{ gap: 10 }}>
          {topThree.map((user, index) => (
            <Animated.View key={user.uid} entering={FadeInUp.delay(index * 70).duration(260)}>
              <PodiumCard
                user={user}
                theme={PODIUM[index]}
                textColor={palette.colors.text}
                mutedColor={palette.colors.textSecondary}
              />
            </Animated.View>
          ))}

          {rest.map((user, index) => (
            <Animated.View key={user.uid} entering={FadeInUp.delay(180 + index * 48).duration(220)}>
              <GlassSurface
                style={{
                  padding: 10,
                  backgroundColor: palette.colors.glass,
                  borderColor: palette.colors.glassBorder,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ width: 24, fontWeight: "900", color: palette.colors.textSecondary }}>
                    {index + 4}
                  </Text>
                  <AvatarWithStatus uri={user.avatarUrl} size={38} online />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.colors.text, fontWeight: "800" }}>{user.displayName}</Text>
                    <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>
                      {user.grade}th grade • {user.tier}
                    </Text>
                  </View>
                  <Text style={{ color: palette.colors.text, fontFamily: "monospace", fontWeight: "700" }}>
                    {formatCompactNumber(user.xp)} XP
                  </Text>
                </View>
              </GlassSurface>
            </Animated.View>
          ))}

          {myRank ? (
            <GlassSurface
              style={{
                marginTop: 2,
                padding: 12,
                borderColor: palette.colors.primary,
                backgroundColor: palette.colors.cardTint,
              }}
            >
              <Text style={{ color: palette.colors.primary, fontWeight: "900", marginBottom: 4 }}>
                Your Rank
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ width: 24, fontWeight: "900", color: palette.colors.text }}>#{myRank.rank}</Text>
                <AvatarWithStatus uri={myRank.user.avatarUrl} size={40} online />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.colors.text, fontWeight: "800" }}>{myRank.user.displayName}</Text>
                  <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>{myRank.user.tier}</Text>
                </View>
                <Text style={{ color: palette.colors.text, fontFamily: "monospace", fontWeight: "700" }}>
                  {formatCompactNumber(myRank.user.xp)} XP
                </Text>
              </View>
            </GlassSurface>
          ) : null}

          <GlassSurface
            style={{
              padding: 12,
              backgroundColor: palette.colors.glass,
              borderColor: palette.colors.glassBorder,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialCommunityIcons name="lock-outline" size={18} color={palette.colors.textSecondary} />
              <Text style={{ color: palette.colors.text, fontWeight: "800" }}>
                How does your school rank?
              </Text>
            </View>
            <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
              School vs school leaderboard is a premium teaser feature.
            </Text>
          </GlassSurface>
        </View>
      )}
    </ScreenShell>
  );
}
