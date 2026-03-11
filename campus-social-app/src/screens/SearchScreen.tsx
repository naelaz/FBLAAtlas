import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, UserCheck, UserPlus } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSegmentedControl } from "../components/ui/GlassSegmentedControl";
import { GlassSurface } from "../components/ui/GlassSurface";
import { TierBadge } from "../components/ui/TierBadge";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import {
  AlumniMentorProfile,
  fetchAlumniMentors,
  sendMentorRequest,
  updateMentorAvailability,
} from "../services/mentorshipService";
import { hapticTap } from "../services/haptics";
import {
  fetchSchoolUsersOnce,
  toggleFollowUser,
} from "../services/socialService";
import { RootStackParamList } from "../navigation/types";
import { UserProfile } from "../types/social";

export function SearchScreen() {
  const { profile } = useAuthContext();
  const { palette } = useThemeContext();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<"all" | "alumni">("all");
  const [query, setQuery] = useState("");
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [mentors, setMentors] = useState<AlumniMentorProfile[]>([]);
  const [mentorMessage, setMentorMessage] = useState("");
  const [mentorAreas, setMentorAreas] = useState("");
  const [availability, setAvailability] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [requestingUid, setRequestingUid] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile) return;
    void fetchSchoolUsersOnce(profile.schoolId)
      .then((rows) => {
        setAllUsers(rows.filter((u) => u.uid !== profile.uid));
        setFollowingIds(new Set(profile.followingIds ?? []));
      })
      .catch(() => undefined);
  }, [profile?.schoolId]);

  useEffect(() => {
    if (!profile || tab !== "alumni") return;
    let active = true;
    void fetchAlumniMentors(profile.schoolId)
      .then((rows) => { if (active) setMentors(rows); })
      .catch(() => { if (active) setMentors([]); });
    return () => { active = false; };
  }, [profile?.schoolId, tab]);

  const filteredUsers = allUsers.filter((u) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      (u.grade ? String(u.grade).includes(q) : false) ||
      (u.officerPosition ?? "").toLowerCase().includes(q)
    );
  });

  const handleFollow = useCallback(async (user: UserProfile) => {
    if (!profile) return;
    hapticTap();
    const wasFollowing = followingIds.has(user.uid);
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(user.uid);
      else next.add(user.uid);
      return next;
    });
    try {
      await toggleFollowUser(profile, user);
    } catch {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.add(user.uid);
        else next.delete(user.uid);
        return next;
      });
    }
  }, [profile, followingIds]);

  if (!profile) return null;

  return (
    <ScreenShell title="Find Members" subtitle="Search students, follow members, and connect with alumni.">
      <View style={{ marginBottom: 12 }}>
        <GlassSegmentedControl
          value={tab}
          options={[
            { value: "all", label: "Members" },
            { value: "alumni", label: "Alumni" },
          ]}
          onValueChange={(value) => {
            if (value === "all" || value === "alumni") setTab(value);
          }}
        />
      </View>

      {tab === "all" ? (
        <>
          <GlassInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or position..."
            leftSlot={<Search size={15} color={palette.colors.textSecondary} />}
            containerStyle={{ marginBottom: 10 }}
          />

          <Text style={{ color: palette.colors.textMuted, fontWeight: "800", fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
            {query.trim() ? `Results (${filteredUsers.length})` : `All Members (${filteredUsers.length})`}
          </Text>

          {filteredUsers.length === 0 ? (
            <Text style={{ color: palette.colors.textSecondary }}>
              {allUsers.length === 0 ? "Loading members..." : "No members found."}
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {filteredUsers.map((user) => {
                const isFollowing = followingIds.has(user.uid);
                return (
                  <Pressable
                    key={user.uid}
                    onPress={() => navigation.navigate("StudentProfile", { userId: user.uid })}
                  >
                    {({ pressed }) => (
                      <GlassSurface
                        pressed={pressed}
                        style={{
                          padding: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: palette.colors.border,
                        }}
                      >
                        <AvatarWithStatus
                          uri={user.avatarUrl}
                          seed={user.displayName}
                          size={44}
                          online={false}
                          tier={user.tier}
                          avatarColor={user.avatarColor || undefined}
                          onPress={() => navigation.navigate("StudentProfile", { userId: user.uid })}
                        />
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={{ color: palette.colors.text, fontWeight: "800", fontSize: 14 }} numberOfLines={1}>
                              {user.displayName}
                            </Text>
                            <TierBadge tier={user.tier} />
                          </View>
                          {user.officerPosition ? (
                            <Text style={{ color: palette.colors.primary, fontSize: 12, fontWeight: "600" }}>
                              {user.officerPosition}
                            </Text>
                          ) : (
                            <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>
                              {user.grade ? `Grade ${user.grade}` : "FBLA Member"}
                            </Text>
                          )}
                        </View>
                        <Pressable
                          onPress={() => void handleFollow(user)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: isFollowing ? palette.colors.border : palette.colors.primary,
                            backgroundColor: isFollowing ? palette.colors.inputSurface : palette.colors.primary,
                          }}
                        >
                          {isFollowing
                            ? <UserCheck size={13} color={palette.colors.textSecondary} />
                            : <UserPlus size={13} color="#fff" />}
                          <Text style={{ color: isFollowing ? palette.colors.textSecondary : "#fff", fontSize: 12, fontWeight: "700" }}>
                            {isFollowing ? "Following" : "Follow"}
                          </Text>
                        </Pressable>
                      </GlassSurface>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      ) : null}

      {tab === "alumni" ? (
        <>
          {profile.profileType === "alumni" ? (
            <GlassSurface style={{ padding: 12, marginBottom: 10 }}>
              <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>
                Alumni Mentor Settings
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <GlassButton
                  variant={availability ? "solid" : "ghost"}
                  size="sm"
                  label={availability ? "Mentoring On" : "Mentoring Off"}
                  style={{ flex: 1 }}
                  onPress={() => setAvailability((prev) => !prev)}
                />
                <GlassButton
                  variant="ghost"
                  size="sm"
                  label={savingAvailability ? "Saving..." : "Save"}
                  style={{ flex: 1 }}
                  disabled={savingAvailability}
                  onPress={async () => {
                    setSavingAvailability(true);
                    try {
                      await updateMentorAvailability(
                        profile.uid,
                        availability,
                        mentorAreas.split(",").map((item) => item.trim()).filter(Boolean),
                      );
                    } finally {
                      setSavingAvailability(false);
                    }
                  }}
                />
              </View>
              <GlassInput
                containerStyle={{ marginTop: 8 }}
                value={mentorAreas}
                onChangeText={setMentorAreas}
                placeholder="Event areas (comma separated)"
              />
            </GlassSurface>
          ) : (
            <GlassSurface style={{ padding: 12, marginBottom: 10 }}>
              <Text style={{ color: palette.colors.textSecondary }}>
                Browse alumni mentors and send mentorship requests.
              </Text>
            </GlassSurface>
          )}

          <GlassInput
            value={mentorMessage}
            onChangeText={setMentorMessage}
            placeholder="Short message for mentor requests"
            containerStyle={{ marginBottom: 10 }}
          />

          <View style={{ gap: 8 }}>
            {mentors.length === 0 ? (
              <Text style={{ color: palette.colors.textSecondary }}>No alumni mentors available right now.</Text>
            ) : (
              mentors.map((mentor) => (
                <GlassSurface key={mentor.uid} style={{ padding: 12 }}>
                  <Text style={{ color: palette.colors.text, fontWeight: "800", fontSize: 14 }}>{mentor.name}</Text>
                  <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
                    {mentor.chapterName || mentor.schoolName}
                  </Text>
                  {mentor.eventAreas.length > 0 ? (
                    <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
                      Areas: {mentor.eventAreas.join(", ")}
                    </Text>
                  ) : null}
                  {profile.profileType !== "alumni" ? (
                    <View style={{ marginTop: 8 }}>
                      <Pressable
                        onPress={async () => {
                          if (requestingUid) return;
                          setRequestingUid(mentor.uid);
                          try {
                            await sendMentorRequest(
                              mentor.uid,
                              profile,
                              mentorMessage || "I'd love mentorship support for FBLA prep.",
                              mentor.eventAreas,
                            );
                          } catch (error) {
                            console.warn("Mentor request failed:", error);
                          } finally {
                            setRequestingUid(null);
                          }
                        }}
                      >
                        {({ pressed }) => (
                          <GlassSurface
                            pressed={pressed}
                            style={{
                              minHeight: 38,
                              borderRadius: 999,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: palette.colors.primary,
                            }}
                          >
                            <Text style={{ color: palette.colors.onPrimary, fontWeight: "700" }}>
                              {requestingUid === mentor.uid ? "Sending..." : "Request Mentorship"}
                            </Text>
                          </GlassSurface>
                        )}
                      </Pressable>
                    </View>
                  ) : null}
                </GlassSurface>
              ))
            )}
          </View>
        </>
      ) : null}
    </ScreenShell>
  );
}
