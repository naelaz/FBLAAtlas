import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSurface } from "../components/ui/GlassSurface";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import { createPracticeChallenge } from "../services/challengeService";
import { hapticTap } from "../services/haptics";
import { fetchSchoolUsersOnce } from "../services/socialService";
import { UserProfile } from "../types/social";

type Props = NativeStackScreenProps<RootStackParamList, "ChallengeMembers">;

export function ChallengeMembersScreen({ route, navigation }: Props) {
  const { eventId, eventName } = route.params;
  const { profile } = useAuthContext();
  const { palette } = useThemeContext();
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [sendingToUid, setSendingToUid] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!profile) {
      return;
    }
    void fetchSchoolUsersOnce(profile.schoolId)
      .then((rows) => {
        if (!active) {
          return;
        }
        setMembers(rows.filter((row) => row.uid !== profile.uid));
      })
      .catch((error) => {
        console.warn("Member list load failed:", error);
      });
    return () => {
      active = false;
    };
  }, [profile?.schoolId, profile?.uid]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return members;
    }
    return members.filter((member) => member.displayName.toLowerCase().includes(q));
  }, [members, search]);

  if (!profile) {
    return null;
  }

  return (
    <ScreenShell
      title="Challenge a Member"
      subtitle={`Send a ${eventName} head-to-head challenge.`}
      showBackButton
      onBackPress={() => navigation.goBack()}
    >
      <GlassInput
        value={search}
        onChangeText={setSearch}
        label="Search Members"
        placeholder="Type a chapter member name"
      />

      <ScrollView style={{ marginTop: 10 }}>
        {filtered.length === 0 ? (
          <EmptyState title="No members found" message="Try another search." />
        ) : (
          filtered.map((member) => (
            <GlassSurface
              key={member.uid}
              style={{
                padding: 12,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: palette.colors.border,
                borderRadius: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <AvatarWithStatus uri={member.avatarUrl} seed={member.displayName} size={40} online tier={member.tier} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{member.displayName}</Text>
                    <Text style={{ color: palette.colors.textSecondary }}>{member.tier} • {member.xp} XP</Text>
                  </View>
                </View>
                <Pressable
                  onPress={async () => {
                    if (sendingToUid) {
                      return;
                    }
                    hapticTap();
                    setSendingToUid(member.uid);
                    try {
                      await createPracticeChallenge(profile, member, eventId, eventName);
                      navigation.goBack();
                    } catch (error) {
                      console.warn("Challenge send failed:", error);
                    } finally {
                      setSendingToUid(null);
                    }
                  }}
                  style={{ minHeight: 40 }}
                >
                  {({ pressed }) => (
                    <GlassSurface
                      pressed={pressed}
                      tone="accent"
                      strong
                      style={{
                        minHeight: 40,
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: palette.colors.primary,
                      }}
                    >
                      <Text style={{ color: palette.colors.onPrimary, fontWeight: "700" }}>
                        {sendingToUid === member.uid ? "Sending..." : "Challenge"}
                      </Text>
                    </GlassSurface>
                  )}
                </Pressable>
              </View>
            </GlassSurface>
          ))
        )}
      </ScrollView>
    </ScreenShell>
  );
}

