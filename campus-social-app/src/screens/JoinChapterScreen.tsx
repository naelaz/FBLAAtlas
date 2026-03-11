import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSurface } from "../components/ui/GlassSurface";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import {
  Chapter,
  findChapterBySchoolName,
  getChapterJoinRequestStatus,
  submitChapterJoinRequest,
} from "../services/chapterService";
import { hapticSuccess, hapticTap } from "../services/haptics";
import { DEFAULT_SCHOOL_NAME, updateUserProfileFields } from "../services/userService";
import { formatSchoolLabel, School, searchSchools } from "../utils/schoolSearch";

export function JoinChapterScreen() {
  const { profile } = useAuthContext();
  const { palette } = useThemeContext();

  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolResults, setSchoolResults] = useState<School[]>([]);
  const [schoolLoading, setSchoolLoading] = useState(false);
  const [schoolError, setSchoolError] = useState("");
  const [schoolRetryTick, setSchoolRetryTick] = useState(0);

  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [chapterName, setChapterName] = useState("");

  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [status, setStatus] = useState<"pending" | "approved" | "denied" | null>(null);
  const [checkingChapter, setCheckingChapter] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const queryValue = schoolQuery.trim();
    if (queryValue.length < 2) {
      setSchoolResults([]);
      setSchoolLoading(false);
      setSchoolError("");
      return;
    }

    const timer = setTimeout(() => {
      void (async () => {
        try {
          setSchoolLoading(true);
          setSchoolError("");
          const next = await searchSchools(queryValue);
          setSchoolResults(next);
        } catch (error) {
          console.warn("School search failed:", error);
          setSchoolResults([]);
          setSchoolError("Could not load schools, try again.");
        } finally {
          setSchoolLoading(false);
        }
      })();
    }, 300);

    return () => clearTimeout(timer);
  }, [schoolQuery, schoolRetryTick]);

  useEffect(() => {
    if (!profile || !selectedChapter) {
      setStatus(null);
      return;
    }

    let cancelled = false;
    const loadStatus = async () => {
      try {
        const nextStatus = await getChapterJoinRequestStatus(selectedChapter.id, profile.uid);
        if (!cancelled) {
          setStatus(nextStatus);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Load chapter request status failed:", error);
          setStatus(null);
        }
      }
    };

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [profile?.uid, selectedChapter?.id]);

  const statusLabel = useMemo(() => {
    if (status === "pending") {
      return "Request Sent";
    }
    if (status === "approved") {
      return "Joined";
    }
    if (status === "denied") {
      return "Request Denied";
    }
    return "Request to Join";
  }, [status]);

  const selectSchool = async (school: School) => {
    if (!profile) {
      return;
    }

    hapticTap();
    setSelectedSchool(school);
    setChapterName(school.name);
    setSchoolQuery("");
    setSchoolResults([]);

    const shouldBackfillSchool =
      !profile.schoolName || profile.schoolName === DEFAULT_SCHOOL_NAME || !profile.schoolCity || !profile.state;

    if (shouldBackfillSchool) {
      try {
        await updateUserProfileFields(profile.uid, {
          schoolName: school.name,
          schoolCity: school.city,
          state: school.state,
        });
      } catch (error) {
        console.warn("School auto-fill update failed:", error);
      }
    }

    setCheckingChapter(true);
    try {
      const existing = await findChapterBySchoolName(school.name);
      setSelectedChapter(existing);
      setStatus(null);
    } catch (error) {
      console.warn("Chapter lookup failed:", error);
      setSelectedChapter(null);
      setStatus(null);
    } finally {
      setCheckingChapter(false);
    }
  };

  if (!profile) {
    return (
      <ScreenShell title="Join Chapter" subtitle="Loading..." showBackButton>
        <EmptyState title="Loading" message="Checking your account." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Join Chapter" subtitle="Find your school chapter and request access." showBackButton>
      <GlassSurface style={{ padding: 16, marginBottom: 12 }}>
        <GlassInput
          label="Search Schools"
          placeholder="Type your school name"
          value={schoolQuery}
          onChangeText={setSchoolQuery}
        />

        {selectedSchool ? (
          <View
            style={{
              marginTop: 8,
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: palette.colors.border,
              backgroundColor: palette.colors.inputSurface,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: palette.colors.text, fontSize: 12 }}>{selectedSchool.name}</Text>
            <Pressable
              onPress={() => {
                setSelectedSchool(null);
                setSelectedChapter(null);
                setStatus(null);
                setChapterName("");
              }}
            >
              <Text style={{ color: palette.colors.textMuted, fontSize: 12 }}>X</Text>
            </Pressable>
          </View>
        ) : null}

        {schoolLoading ? <Text style={{ color: palette.colors.textSecondary, marginTop: 8 }}>Searching schools...</Text> : null}

        {schoolError ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
            <Text style={{ color: palette.colors.danger, flex: 1 }}>{schoolError}</Text>
            <GlassButton
              variant="ghost"
              size="sm"
              label="Retry"
              fullWidth={false}
              onPress={() => setSchoolRetryTick((prev) => prev + 1)}
            />
          </View>
        ) : null}

        {schoolResults.length > 0 ? (
          <GlassSurface style={{ padding: 8, maxHeight: 180, marginTop: 8 }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {schoolResults.map((school) => (
                <Pressable
                  key={`${school.name}-${school.state}-${school.city}`}
                  onPress={() => {
                    void selectSchool(school);
                  }}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: palette.colors.divider,
                  }}
                >
                  <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{formatSchoolLabel(school)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </GlassSurface>
        ) : null}

        {!schoolLoading && !schoolError && schoolQuery.trim().length >= 2 && schoolResults.length === 0 ? (
          <Text style={{ color: palette.colors.textMuted, marginTop: 8 }}>No schools found. Try a different search.</Text>
        ) : null}
      </GlassSurface>

      {selectedSchool ? (
        <GlassSurface style={{ padding: 16, marginBottom: 12 }}>
          <GlassInput
            label="Chapter Name"
            value={chapterName}
            onChangeText={setChapterName}
            placeholder="Chapter name"
          />

          {checkingChapter ? (
            <Text style={{ color: palette.colors.textMuted, marginTop: 10 }}>Checking for an existing chapter...</Text>
          ) : selectedChapter ? (
            <>
              <Text style={{ color: palette.colors.text, fontWeight: "700", fontSize: 16, marginTop: 10 }}>
                {selectedChapter.name}
              </Text>
              <Text style={{ color: palette.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {selectedChapter.school} - {selectedChapter.city}, {selectedChapter.state}
              </Text>
              <Text style={{ color: palette.colors.textMuted, marginTop: 6 }}>
                Member count: {selectedChapter.memberCount}
              </Text>

              <Text
                style={{
                  color: palette.colors.textMuted,
                  marginTop: 16,
                  marginBottom: 8,
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Officers
              </Text>
              {selectedChapter.officers.length > 0 ? (
                selectedChapter.officers.map((officer, index) => (
                  <Text key={`${officer}-${index}`} style={{ color: palette.colors.text, fontSize: 14, marginBottom: 6 }}>
                    {officer}
                  </Text>
                ))
              ) : (
                <Text style={{ color: palette.colors.textMuted }}>No officer list available yet.</Text>
              )}

              <GlassButton
                variant="solid"
                label={statusLabel}
                style={{ marginTop: 12 }}
                disabled={status === "pending" || status === "approved" || sending}
                loading={sending}
                onPress={async () => {
                  try {
                    setSending(true);
                    await submitChapterJoinRequest(selectedChapter, profile);
                    setStatus("pending");
                    hapticSuccess();
                  } catch (error) {
                    console.warn("Chapter request failed:", error);
                  } finally {
                    setSending(false);
                  }
                }}
              />
              {status === "pending" ? (
                <Text style={{ color: palette.colors.success, marginTop: 8 }}>
                  Request sent. A chapter officer will review it soon.
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={{ color: palette.colors.textMuted, marginTop: 10, fontSize: 14 }}>
                No chapter found for {selectedSchool.name} yet.
              </Text>
              <Text style={{ color: palette.colors.textSecondary, marginTop: 6, fontSize: 13, lineHeight: 20 }}>
                Contact your FBLA advisor or a chapter president to get your school set up. Once created, you can search and request to join here.
              </Text>
            </>
          )}
        </GlassSurface>
      ) : null}
    </ScreenShell>
  );
}
