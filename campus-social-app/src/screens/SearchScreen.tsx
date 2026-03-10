import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
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
import { searchFblaAtlas } from "../services/socialService";
import { PostItem, UserProfile } from "../types/social";

export function SearchScreen() {
  const { profile } = useAuthContext();
  const { palette } = useThemeContext();
  const [tab, setTab] = useState<"all" | "alumni">("all");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [mentors, setMentors] = useState<AlumniMentorProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [mentorMessage, setMentorMessage] = useState("");
  const [mentorAreas, setMentorAreas] = useState("");
  const [availability, setAvailability] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [requestingUid, setRequestingUid] = useState<string | null>(null);

  const runSearch = async () => {
    if (!profile || !query.trim()) {
      setUsers([]);
      setPosts([]);
      return;
    }

    setSearching(true);
    try {
      const result = await searchFblaAtlas(profile.schoolId, query);
      setUsers(result.users);
      setPosts(result.posts);
    } catch (error) {
      console.warn("Search failed:", error);
      setUsers([]);
      setPosts([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (!profile || tab !== "alumni") {
      return;
    }
    let active = true;
    void fetchAlumniMentors(profile.schoolId)
      .then((rows) => {
        if (active) {
          setMentors(rows);
        }
      })
      .catch((error) => {
        console.warn("Alumni mentor load failed:", error);
        if (active) {
          setMentors([]);
        }
      });
    return () => {
      active = false;
    };
  }, [profile?.schoolId, tab]);

  if (!profile) {
    return null;
  }

  return (
    <ScreenShell title="Search" subtitle="Find members, posts, and alumni mentors.">
      <View style={{ marginBottom: 12 }}>
        <GlassSegmentedControl
          value={tab}
          options={[
            { value: "all", label: "All" },
            { value: "alumni", label: "Alumni" },
          ]}
          onValueChange={(value) => {
            if (value === "all" || value === "alumni") {
              setTab(value);
            }
          }}
        />
      </View>

      {tab === "all" ? (
        <>
          <GlassInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search names, grades, post keywords"
          />

          <GlassButton
            variant="solid"
            size="sm"
            label={searching ? "Searching..." : "Search FBLA Atlas"}
            style={{ marginTop: 10 }}
            disabled={searching}
            onPress={() => void runSearch()}
          />

          <View style={{ marginTop: 14, gap: 8 }}>
            <Text variant="titleMedium" style={{ fontWeight: "700", color: palette.colors.text }}>
              Students
            </Text>
            {users.map((user) => (
              <GlassSurface
                key={user.uid}
                style={{ backgroundColor: palette.colors.surface, padding: 12 }}
              >
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{user.displayName}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <Text style={{ color: palette.colors.textSecondary }}>{user.grade}th grade</Text>
                  <TierBadge tier={user.tier} />
                </View>
              </GlassSurface>
            ))}
            {users.length === 0 ? (
              <Text style={{ color: palette.colors.textSecondary }}>No student results yet.</Text>
            ) : null}
          </View>

          <View style={{ marginTop: 14, gap: 8 }}>
            <Text variant="titleMedium" style={{ fontWeight: "700", color: palette.colors.text }}>
              Posts
            </Text>
            {posts.map((post) => (
              <GlassSurface
                key={post.id}
                style={{ backgroundColor: palette.colors.surface, padding: 12 }}
              >
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{post.authorName}</Text>
                <Text style={{ color: palette.colors.textSecondary }}>{post.likeCount} likes</Text>
                <Text style={{ color: palette.colors.text, marginTop: 6 }}>{post.content}</Text>
              </GlassSurface>
            ))}
            {posts.length === 0 ? (
              <Text style={{ color: palette.colors.textSecondary }}>No post results yet.</Text>
            ) : null}
          </View>
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
          />

          <View style={{ marginTop: 10, gap: 8 }}>
            {mentors.length === 0 ? (
              <Text style={{ color: palette.colors.textSecondary }}>No alumni mentors available right now.</Text>
            ) : (
              mentors.map((mentor) => (
                <GlassSurface key={mentor.uid} style={{ padding: 12 }}>
                  <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{mentor.name}</Text>
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
