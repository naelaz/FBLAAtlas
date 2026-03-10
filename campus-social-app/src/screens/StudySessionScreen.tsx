import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSegmentedControl } from "../components/ui/GlassSegmentedControl";
import { GlassSurface } from "../components/ui/GlassSurface";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import {
  endStudySession,
  fetchStudySessionById,
  sendStudyMessage,
  subscribeStudyMessages,
} from "../services/studySessionService";
import { StudySession, StudySessionMessage } from "../types/features";

type Props = NativeStackScreenProps<RootStackParamList, "StudySession">;

export function StudySessionScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const { palette } = useThemeContext();
  const { profile } = useAuthContext();
  const [session, setSession] = useState<StudySession | null>(null);
  const [messages, setMessages] = useState<StudySessionMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"practice_together" | "quiz_each_other">("practice_together");

  useEffect(() => {
    let active = true;
    void fetchStudySessionById(sessionId)
      .then((row) => {
        if (!active) {
          return;
        }
        setSession(row);
        if (row) {
          setMode(row.mode);
        }
      })
      .catch((error) => {
        console.warn("Study session load failed:", error);
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  useEffect(() => {
    const unsubscribe = subscribeStudyMessages(sessionId, setMessages);
    return unsubscribe;
  }, [sessionId]);

  const sessionTitle = useMemo(() => {
    if (!session) {
      return "Study Session";
    }
    return session.eventNames.length > 0 ? session.eventNames.join(", ") : "Group Study";
  }, [session]);

  if (!profile) {
    return null;
  }

  const isCreator = session?.createdByUid === profile.uid;

  return (
    <ScreenShell
      title="Study Session"
      subtitle={sessionTitle}
      showBackButton
      onBackPress={() => navigation.goBack()}
    >
      <GlassSegmentedControl
        value={mode}
        options={[
          { value: "practice_together", label: "Practice Together" },
          { value: "quiz_each_other", label: "Quiz Each Other" },
        ]}
        onValueChange={(value) => {
          if (value === "practice_together" || value === "quiz_each_other") {
            setMode(value);
          }
        }}
      />

      <GlassSurface style={{ marginTop: 10, padding: 12 }}>
        <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
          {mode === "practice_together" ? "Shared Flashcard Pace" : "Question-by-Question Chat Quiz"}
        </Text>
        <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
          {mode === "practice_together"
            ? "Everyone reviews the same deck and tracks group progress."
            : "Quizmaster drops prompts and members answer in chat."}
        </Text>
      </GlassSurface>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        style={{ marginTop: 10, maxHeight: 320 }}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <GlassSurface style={{ padding: 10 }}>
            <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{item.name}</Text>
            <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>{item.text}</Text>
          </GlassSurface>
        )}
      />

      <GlassInput
        containerStyle={{ marginTop: 10 }}
        value={draft}
        onChangeText={setDraft}
        label="Session Chat"
        placeholder="Send a question, answer, or tip..."
      />
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <GlassButton
            variant="solid"
            label="Send"
            disabled={!draft.trim()}
            onPress={async () => {
              if (!draft.trim()) {
                return;
              }
              await sendStudyMessage(sessionId, profile, draft);
              setDraft("");
            }}
          />
        </View>
        {isCreator ? (
          <View style={{ flex: 1 }}>
            <GlassButton
              variant="ghost"
              label="End Session"
              onPress={async () => {
                await endStudySession(sessionId);
                navigation.goBack();
              }}
            />
          </View>
        ) : null}
      </View>
    </ScreenShell>
  );
}
