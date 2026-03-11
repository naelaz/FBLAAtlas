import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassSegmentedControl } from "../components/ui/GlassSegmentedControl";
import { GlassSurface } from "../components/ui/GlassSurface";
import { TierBadge } from "../components/ui/TierBadge";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { fetchDuelLeaderboard } from "../services/challengeService";
import { subscribeRecognitionPlacements } from "../services/recognitionService";
import { fetchLeaderboardOnce, subscribeLeaderboard } from "../services/socialService";
import { DuelLeaderboardRow, RecognitionPlacement } from "../types/features";
import { UserProfile } from "../types/social";
import { RootStackParamList } from "../navigation/types";
import { formatCompactNumber } from "../utils/format";

type PodiumTheme = {
  icon: React.ComponentProps<typeof Feather>["name"];
};

type LeaderboardDisplayRow = {
  uid: string;
  displayName: string;
  avatarUrl: string;
  avatarColor?: string;
  tier: UserProfile["tier"];
  grade: string;
  xp: number;
  primaryEvent?: string;
  isPlaceholder?: boolean;
};

const PODIUM: PodiumTheme[] = [
  { icon: "award" },
  { icon: "star" },
  { icon: "shield" },
];

const SEEDED_LEADERBOARD_ROWS: LeaderboardDisplayRow[] = [
  { uid: "seed_lb_alex", displayName: "Alex M.", avatarUrl: "", tier: "Gold", grade: "12", xp: 280, primaryEvent: "Business Law", isPlaceholder: true },
  { uid: "seed_lb_jordan", displayName: "Jordan K.", avatarUrl: "", tier: "Silver", grade: "11", xp: 145, primaryEvent: "Public Speaking", isPlaceholder: true },
  { uid: "seed_lb_sam", displayName: "Sam R.", avatarUrl: "", tier: "Silver", grade: "11", xp: 120, primaryEvent: "Entrepreneurship", isPlaceholder: true },
  { uid: "seed_lb_taylor", displayName: "Taylor B.", avatarUrl: "", tier: "Bronze", grade: "10", xp: 65, primaryEvent: "Marketing", isPlaceholder: true },
  { uid: "seed_lb_riley", displayName: "Riley C.", avatarUrl: "", tier: "Bronze", grade: "10", xp: 52, primaryEvent: "Coding & Programming", isPlaceholder: true },
];

function toDisplayRow(user: UserProfile): LeaderboardDisplayRow {
  return {
    uid: user.uid,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    avatarColor: user.avatarColor,
    tier: user.tier,
    grade: user.grade,
    xp: user.xp,
    primaryEvent: user.primaryEvent,
    isPlaceholder: user.isSeeded,
  };
}

function PodiumCard({
  user,
  theme,
  textColor,
  mutedColor,
  surfaceColor,
  onPress,
}: {
  user: LeaderboardDisplayRow;
  theme: PodiumTheme;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress || user.isPlaceholder}>
      {({ pressed }) => (
        <GlassSurface
          pressed={pressed}
          style={{
            padding: 12,
            borderColor: mutedColor,
            backgroundColor: surfaceColor,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <AvatarWithStatus
              uri={user.avatarUrl}
              seed={user.displayName}
              size={46}
              online
              tier={user.tier}
              avatarColor={user.avatarColor || undefined}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontWeight: "900", color: textColor }}>{user.displayName}</Text>
                <TierBadge tier={user.tier} />
              </View>
              <Text style={{ color: mutedColor }}>
                {formatCompactNumber(user.xp)} XP
              </Text>
            </View>
            <Feather name={theme.icon} size={22} color={mutedColor} />
          </View>
        </GlassSurface>
      )}
    </Pressable>
  );
}

export function LeaderboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuthContext();
  const { palette } = useThemeContext();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"xp" | "recognition" | "duels">("xp");
  const [recognitionRows, setRecognitionRows] = useState<RecognitionPlacement[]>([]);
  const [duelRows, setDuelRows] = useState<DuelLeaderboardRow[]>([]);

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

  useEffect(() => {
    if (!profile?.schoolId) {
      setRecognitionRows([]);
      return;
    }
    const unsubscribe = subscribeRecognitionPlacements(profile.schoolId, setRecognitionRows);
    return unsubscribe;
  }, [profile?.schoolId]);

  useEffect(() => {
    if (!profile?.schoolId) {
      setDuelRows([]);
      return;
    }
    let active = true;
    void fetchDuelLeaderboard(profile.schoolId)
      .then((rows) => {
        if (active) {
          setDuelRows(rows);
        }
      })
      .catch((error) => {
        console.warn("Duel leaderboard fetch failed:", error);
      });
    return () => {
      active = false;
    };
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

  const realRankedRows = useMemo(
    () =>
      users
        .filter((item) => !item.isSeeded && item.xp > 0)
        .sort((a, b) => b.xp - a.xp)
        .map((item) => toDisplayRow(item)),
    [users],
  );
  const leaderboardRows = useMemo(() => {
    if (realRankedRows.length >= 5) {
      return realRankedRows;
    }
    const existingIds = new Set(realRankedRows.map((row) => row.uid));
    const filler = SEEDED_LEADERBOARD_ROWS.filter((row) => !existingIds.has(row.uid));
    return [...realRankedRows, ...filler];
  }, [realRankedRows]);
  const showPlaceholderNote = realRankedRows.length < 5;
  const topThreeRows = leaderboardRows.slice(0, 3);
  const restRows = leaderboardRows.slice(3, 10);
  const myRank = useMemo(() => {
    if (!profile) {
      return null;
    }
    const index = leaderboardRows.findIndex((item) => item.uid === profile.uid);
    if (index === -1) {
      return null;
    }
    return {
      rank: index + 1,
      user: leaderboardRows[index],
    };
  }, [leaderboardRows, profile]);

  return (
    <ScreenShell
      title="Leaderboard"
      subtitle="XP, recognition wall, and duel rankings."
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    >
      <View style={{ marginBottom: 12 }}>
        <GlassSegmentedControl
          value={tab}
          options={[
            { value: "xp", label: "XP" },
            { value: "recognition", label: "Recognition" },
            { value: "duels", label: "Duels" },
          ]}
          onValueChange={(value) => {
            if (value === "xp" || value === "recognition" || value === "duels") {
              setTab(value);
            }
          }}
        />
      </View>

      {tab === "xp" ? (
        leaderboardRows.length === 0 ? (
          <EmptyState title="No leaderboard data" message="Pull to refresh after users start earning XP." />
        ) : (
          <View style={{ gap: 10 }}>
            {topThreeRows.map((user, index) => (
              <View key={user.uid}>
                <PodiumCard
                  user={user}
                  theme={PODIUM[index]}
                  textColor={palette.colors.text}
                  mutedColor={palette.colors.textSecondary}
                  surfaceColor={palette.colors.surface}
                  onPress={!user.isPlaceholder ? () => navigation.navigate("StudentProfile", { userId: user.uid }) : undefined}
                />
              </View>
            ))}

            {restRows.map((user, index) => (
              <Pressable
                key={user.uid}
                onPress={!user.isPlaceholder ? () => navigation.navigate("StudentProfile", { userId: user.uid }) : undefined}
                disabled={user.isPlaceholder}
              >
                {({ pressed }) => (
                  <GlassSurface
                    pressed={pressed}
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
                      <AvatarWithStatus
                        uri={user.avatarUrl}
                        seed={user.displayName}
                        size={38}
                        online
                        tier={user.tier}
                        avatarColor={user.avatarColor || undefined}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: palette.colors.text, fontWeight: "800" }}>
                          {user.displayName}
                        </Text>
                        <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>
                          {user.primaryEvent ? user.primaryEvent : `${user.grade}th grade`}
                        </Text>
                      </View>
                      <TierBadge tier={user.tier} />
                      <Text style={{ color: palette.colors.text, fontFamily: "monospace", fontWeight: "700" }}>
                        {formatCompactNumber(user.xp)} XP
                      </Text>
                    </View>
                  </GlassSurface>
                )}
              </Pressable>
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
                  <AvatarWithStatus
                    uri={myRank.user.avatarUrl}
                    seed={myRank.user.displayName}
                    size={40}
                    online
                    tier={myRank.user.tier}
                    avatarColor={myRank.user.avatarColor || undefined}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.colors.text, fontWeight: "800" }}>
                      {myRank.user.displayName}
                    </Text>
                    <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>
                      {myRank.user.primaryEvent ? myRank.user.primaryEvent : `${myRank.user.grade}th grade`}
                    </Text>
                  </View>
                  <TierBadge tier={myRank.user.tier} />
                  <Text style={{ color: palette.colors.text, fontFamily: "monospace", fontWeight: "700" }}>
                    {formatCompactNumber(myRank.user.xp)} XP
                  </Text>
                </View>
              </GlassSurface>
            ) : null}

            {showPlaceholderNote ? (
              <Text style={{ color: palette.colors.textMuted, fontSize: 12, textAlign: "center" }}>
                Placeholder members shown until chapter members join.
              </Text>
            ) : null}
          </View>
        )
      ) : null}

      {tab === "recognition" ? (
        recognitionRows.length === 0 ? (
          <EmptyState title="No chapter wins yet" message="Placement submissions will appear here." />
        ) : (
          <View style={{ gap: 8 }}>
            {recognitionRows.slice(0, 40).map((item) => (
              <GlassSurface key={item.id} style={{ padding: 12 }}>
                <Text style={{ color: palette.colors.text, fontWeight: "800" }}>
                  {item.userName}
                </Text>
                <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
                  {item.place} • {item.eventName} • {item.level} {item.year}
                </Text>
                <Text
                  style={{
                    color: item.verified ? palette.colors.success : palette.colors.warning,
                    marginTop: 4,
                    fontSize: 12,
                  }}
                >
                  {item.verified ? "Verified" : "Pending verification"}
                </Text>
              </GlassSurface>
            ))}
          </View>
        )
      ) : null}

      {tab === "duels" ? (
        duelRows.length === 0 ? (
          <EmptyState title="No duel rankings yet" message="Complete at least 5 duels to qualify." />
        ) : (
          <View style={{ gap: 8 }}>
            {duelRows.map((row, index) => (
              <GlassSurface key={row.uid} style={{ padding: 12 }}>
                <Text style={{ color: palette.colors.text, fontWeight: "800" }}>
                  #{index + 1} {row.name}
                </Text>
                <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
                  {Math.round(row.winRate * 100)}% win rate • {row.wins}W-{row.losses}L • {row.totalDuels} duels
                </Text>
              </GlassSurface>
            ))}
          </View>
        )
      ) : null}
    </ScreenShell>
  );
}

