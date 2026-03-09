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
  getChapterJoinRequestStatus,
  searchChapters,
  submitChapterJoinRequest,
} from "../services/chapterService";
import { hapticSuccess, hapticTap } from "../services/haptics";

export function JoinChapterScreen() {
  const { profile } = useAuthContext();
  const { palette } = useThemeContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [status, setStatus] = useState<"pending" | "approved" | "denied" | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const next = await searchChapters(query);
        if (!cancelled) {
          setResults(next);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Chapter search failed:", error);
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [query]);

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
          label="Search Chapters"
          placeholder="Type school or chapter name"
          value={query}
          onChangeText={setQuery}
        />
      </GlassSurface>

      <GlassSurface style={{ padding: 16, marginBottom: 12 }}>
        <Text style={{ color: palette.colors.text, fontWeight: "700", fontSize: 16, marginBottom: 10 }}>
          Results
        </Text>
        {loading ? (
          <Text style={{ color: palette.colors.textMuted }}>Searching chapters...</Text>
        ) : results.length === 0 ? (
          <EmptyState title="No chapters found" message="Try a different school or city." />
        ) : (
          <ScrollView style={{ maxHeight: 260 }}>
            {results.map((chapter) => (
              <Pressable
                key={chapter.id}
                onPress={() => {
                  hapticTap();
                  setSelectedChapter(chapter);
                }}
                style={{ marginBottom: 8 }}
              >
                {({ pressed }) => (
                  <GlassSurface
                    pressed={pressed}
                    style={{
                      padding: 12,
                      borderColor: selectedChapter?.id === chapter.id ? palette.colors.accent : palette.colors.border,
                    }}
                  >
                    <Text style={{ color: palette.colors.text, fontWeight: "600", fontSize: 14 }}>
                      {chapter.name}
                    </Text>
                    <Text style={{ color: palette.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {chapter.school} • {chapter.city}, {chapter.state}
                    </Text>
                    <Text style={{ color: palette.colors.textMuted, fontSize: 12 }}>
                      Members: {chapter.memberCount}
                    </Text>
                  </GlassSurface>
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </GlassSurface>

      {selectedChapter ? (
        <GlassSurface style={{ padding: 16 }}>
          <Text style={{ color: palette.colors.text, fontWeight: "700", fontSize: 16 }}>
            {selectedChapter.name}
          </Text>
          <Text style={{ color: palette.colors.textMuted, marginTop: 4 }}>
            {selectedChapter.school} • {selectedChapter.city}, {selectedChapter.state}
          </Text>
          <Text style={{ color: palette.colors.textMuted, marginTop: 6 }}>
            Member count: {selectedChapter.memberCount}
          </Text>
          <Text
            style={{
              color: palette.colors.textMuted,
              marginTop: 20,
              marginBottom: 10,
              fontSize: 13,
              fontWeight: "600",
              letterSpacing: 0.8,
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
        </GlassSurface>
      ) : null}
    </ScreenShell>
  );
}
