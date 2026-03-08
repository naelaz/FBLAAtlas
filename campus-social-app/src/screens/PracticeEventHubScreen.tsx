import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
  useAudioRecorder,
} from "expo-audio";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Badge } from "../components/ui/badge";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassInput } from "../components/ui/GlassInput";
import { MessageLoading } from "../components/ui/MessageLoading";
import { GlassSegmentedControl } from "../components/ui/GlassSegmentedControl";
import { GlassSurface } from "../components/ui/GlassSurface";
import {
  MagicCardFlashcard,
  MagicCardQuestion,
  MagicCardRubric,
  MagicCardScore,
} from "../components/ui/MagicCard";
import { FBLA_EVENT_DEFINITIONS, getFblaEventById, PracticeDifficulty } from "../constants/fblaEvents";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import {
  evaluateMockJudge,
  fetchPracticeAttempts,
  generateFlashcards,
  generateObjectiveTest,
  generatePresentationScenario,
  savePracticeAttempt,
} from "../services/practiceService";
import {
  MockJudgeResult,
  PracticeAttempt,
  PracticeFlashcard,
  PracticeScenario,
  PracticeTest,
} from "../types/practice";
import { ScreenShell } from "../components/ScreenShell";

type Props = NativeStackScreenProps<RootStackParamList, "PracticeEventHub">;
type HubMode = "objective_test" | "presentation" | "flashcards" | "mock_judge";

const DIFFICULTIES: PracticeDifficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
  "competition_ready",
];

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function isStaleCache(generatedAt?: string): boolean {
  if (!generatedAt) {
    return false;
  }
  const timestamp = Date.parse(generatedAt);
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000;
}

export function PracticeEventHubScreen({ route }: Props) {
  const { eventId, mode: modeFromRoute } = route.params;
  const { palette } = useThemeContext();
  const { profile, isGuest } = useAuthContext();

  const event = useMemo(() => getFblaEventById(eventId), [eventId]);

  const [mode, setMode] = useState<HubMode>(modeFromRoute ?? "objective_test");
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>("intermediate");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [test, setTest] = useState<PracticeTest | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState<{ score: number; max: number } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timerSetting, setTimerSetting] = useState<"20" | "30" | "no_limit">("30");

  const [scenario, setScenario] = useState<PracticeScenario | null>(null);
  const [presentationNotes, setPresentationNotes] = useState("");
  const [presentationFeedback, setPresentationFeedback] = useState<MockJudgeResult | null>(null);

  const [cards, setCards] = useState<PracticeFlashcard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [cardBackVisible, setCardBackVisible] = useState(false);

  const [mockSubmission, setMockSubmission] = useState("");
  const [mockResult, setMockResult] = useState<MockJudgeResult | null>(null);
  const [history, setHistory] = useState<PracticeAttempt[]>([]);
  const [submittingTest, setSubmittingTest] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const hasAutoSubmittedRef = useRef(false);

  useEffect(() => {
    if (!modeFromRoute) {
      return;
    }
    setMode(modeFromRoute);
  }, [modeFromRoute]);

  useEffect(() => {
    if (!test) {
      return;
    }

    if (secondsLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, test]);

  useEffect(() => {
    if (!test || !testResult || timerSetting === "no_limit") {
      return;
    }
    hasAutoSubmittedRef.current = true;
  }, [test, testResult, timerSetting]);

  useEffect(() => {
    if (!test || timerSetting === "no_limit" || secondsLeft > 0 || testResult) {
      return;
    }
    if (hasAutoSubmittedRef.current) {
      return;
    }
    hasAutoSubmittedRef.current = true;
    setError("Time is up. Your test was submitted automatically.");
    void submitObjectiveTest();
  }, [secondsLeft, test, testResult, timerSetting]);

  useEffect(() => {
    return () => {
      if (recorder.isRecording) {
        void recorder.stop().catch(() => undefined);
      }
    };
  }, [recorder]);

  useEffect(() => {
    if (!profile || !event) {
      setHistory([]);
      return;
    }

    void fetchPracticeAttempts(profile.uid, event.id)
      .then((rows) => {
        setHistory(rows.slice(0, 12));
      })
      .catch((fetchError) => {
        console.warn("Practice history fetch failed:", fetchError);
      });
  }, [event, profile?.uid, testResult, presentationFeedback, mockResult]);

  const countdownColor = useMemo(() => {
    if (!test) {
      return palette.colors.primary;
    }
    if (test.timeLimitMinutes <= 0) {
      return palette.colors.primary;
    }
    const total = test.timeLimitMinutes * 60;
    if (secondsLeft <= Math.floor(total * 0.25)) {
      return palette.colors.danger;
    }
    if (secondsLeft <= Math.floor(total * 0.5)) {
      return palette.colors.warning;
    }
    return palette.colors.primary;
  }, [palette.colors, secondsLeft, test]);

  if (!event) {
    return (
      <ScreenShell title="Practice Hub" subtitle="Event not found.">
        <EmptyState title="Missing Event" message="This event is not available in the catalog." />
      </ScreenShell>
    );
  }

  const difficultyLabel = DIFFICULTIES.map((value) => ({
    value,
    label:
      value === "competition_ready"
        ? "Comp Ready"
        : `${value.charAt(0).toUpperCase()}${value.slice(1)}`,
  }));

  const startObjectiveTest = async () => {
    setBusy(true);
    setError(null);
    setTestResult(null);
    setTestAnswers({});
    hasAutoSubmittedRef.current = false;
    try {
      const next = await generateObjectiveTest(event, difficulty);
      if (timerSetting === "no_limit") {
        setTest({ ...next, timeLimitMinutes: 0 });
        setSecondsLeft(0);
      } else {
        const forcedMinutes = timerSetting === "20" ? 20 : 30;
        setTest({ ...next, timeLimitMinutes: forcedMinutes });
        setSecondsLeft(forcedMinutes * 60);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not generate test.");
    } finally {
      setBusy(false);
    }
  };

  const submitObjectiveTest = async () => {
    if (!test || submittingTest) {
      return;
    }

    setSubmittingTest(true);

    const answered = test.questions.reduce((score, question) => {
      const selected = testAnswers[question.id];
      return score + (selected === question.correctIndex ? 1 : 0);
    }, 0);

    setTestResult({ score: answered, max: test.questions.length });

    if (!profile || isGuest) {
      setSubmittingTest(false);
      return;
    }

    try {
      await savePracticeAttempt(profile.uid, {
        eventId: event.id,
        eventName: event.name,
        mode: "objective_test",
        score: answered,
        maxScore: test.questions.length,
        difficulty,
        metadata: {
          answeredCount: Object.keys(testAnswers).length,
        },
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save test attempt.");
    } finally {
      setSubmittingTest(false);
    }
  };

  const generateScenario = async () => {
    setBusy(true);
    setError(null);
    setPresentationFeedback(null);
    try {
      const next = await generatePresentationScenario(event, difficulty);
      setScenario(next);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not generate scenario.");
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone permission is required for recording.");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordingActive(true);
      setRecordingUri(null);
    } catch (recordingError) {
      setError(recordingError instanceof Error ? recordingError.message : "Could not start recording.");
    }
  };

  const stopRecording = async () => {
    if (!recordingActive && !recorder.isRecording) {
      return;
    }

    try {
      await recorder.stop();
      const uri = recorder.uri;
      setRecordingUri(uri ?? null);
    } catch (recordingError) {
      setError(recordingError instanceof Error ? recordingError.message : "Could not stop recording.");
    } finally {
      setRecordingActive(false);
    }
  };

  const runPresentationFeedback = async () => {
    const submission = `${presentationNotes.trim()} ${recordingUri ? "[audio_recording_attached]" : ""}`.trim();
    if (!submission) {
      setError("Add notes about your response before requesting feedback.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const feedback = await evaluateMockJudge(event, submission);
      setPresentationFeedback(feedback);

      if (profile && !isGuest) {
        await savePracticeAttempt(profile.uid, {
          eventId: event.id,
          eventName: event.name,
          mode: "presentation_coach",
          score: feedback.totalScore,
          maxScore: feedback.maxScore,
          difficulty,
          metadata: {
            usedRecording: Boolean(recordingUri),
          },
        });
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not generate feedback.");
    } finally {
      setBusy(false);
    }
  };

  const loadFlashcards = async () => {
    setBusy(true);
    setError(null);
    try {
      const deck = await generateFlashcards(event, difficulty);
      setCards(deck);
      setCardIndex(0);
      setCardBackVisible(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not generate flashcards.");
    } finally {
      setBusy(false);
    }
  };

  const markCard = async (confidence: "known" | "review") => {
    if (cards.length === 0) {
      return;
    }

    const updated = [...cards];
    updated[cardIndex] = { ...updated[cardIndex], confidence };
    setCards(updated);
    setCardBackVisible(false);

    const nextIndex = cardIndex + 1;
    if (nextIndex < updated.length) {
      setCardIndex(nextIndex);
      return;
    }

    const knownCount = updated.filter((card) => card.confidence === "known").length;
    if (profile && !isGuest) {
      await savePracticeAttempt(profile.uid, {
        eventId: event.id,
        eventName: event.name,
        mode: "flashcards",
        score: knownCount,
        maxScore: updated.length,
        difficulty,
      });
    }
  };

  const runMockJudge = async () => {
    if (!mockSubmission.trim()) {
      setError("Enter your project summary or response before scoring.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await evaluateMockJudge(event, mockSubmission.trim());
      setMockResult(result);

      if (profile && !isGuest) {
        await savePracticeAttempt(profile.uid, {
          eventId: event.id,
          eventName: event.name,
          mode: "mock_judge",
          score: result.totalScore,
          maxScore: result.maxScore,
          difficulty,
        });
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not run mock judge.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell
      title={event.name}
      subtitle={`${event.category} • ${event.teamEvent ? "Team" : "Individual"} • ${event.eventType.replaceAll("_", " ")}`}
    >
      <MagicCardRubric style={{ marginBottom: 12 }}>
        <Text style={{ color: palette.colors.text, fontWeight: "800" }}>Official Quick Reference</Text>
        <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>{event.description}</Text>
        <Text style={{ color: palette.colors.textSecondary, marginTop: 6 }}>
          Time limit: {event.defaultTimeLimitMinutes} min • Materials: {event.materialsAllowed.join(", ")}
        </Text>
        <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
          Guidelines: https://www.fbla-pbl.org/fbla/competitive-events/ • Docs: https://www.fbla-pbl.org/docs/
        </Text>
      </MagicCardRubric>

      <View style={{ marginBottom: 10 }}>
        <Text style={{ color: palette.colors.textSecondary, marginBottom: 6, fontWeight: "700", fontSize: 12 }}>
          Practice Mode
        </Text>
        <GlassSegmentedControl
          value={mode}
          options={[
            { value: "objective_test", label: "Test" },
            { value: "presentation", label: "Coach" },
            { value: "flashcards", label: "Flashcards" },
            { value: "mock_judge", label: "Judge" },
          ]}
          onValueChange={(nextValue) => {
            if (
              nextValue === "objective_test" ||
              nextValue === "presentation" ||
              nextValue === "flashcards" ||
              nextValue === "mock_judge"
            ) {
              setMode(nextValue);
            }
          }}
        />
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: palette.colors.textSecondary, marginBottom: 6, fontWeight: "700", fontSize: 12 }}>
          Difficulty
        </Text>
        <GlassSegmentedControl
          value={difficulty}
          options={difficultyLabel.map((entry) => ({ value: entry.value, label: entry.label }))}
          onValueChange={(nextValue) => {
            if (
              nextValue === "beginner" ||
              nextValue === "intermediate" ||
              nextValue === "advanced" ||
              nextValue === "competition_ready"
            ) {
              setDifficulty(nextValue);
            }
          }}
          size="sm"
        />
      </View>

      {error ? (
        <GlassSurface style={{ padding: 10, marginBottom: 12, borderColor: palette.colors.danger }}>
          <Text style={{ color: palette.colors.danger }}>{error}</Text>
        </GlassSurface>
      ) : null}
      {(isStaleCache(test?.generatedAt) || isStaleCache(scenario?.generatedAt) || isStaleCache(cards[0]?.generatedAt)) ? (
        <GlassSurface style={{ padding: 10, marginBottom: 12, borderColor: palette.colors.warning }}>
          <Text style={{ color: palette.colors.warning }}>
            Using cached content while AI is unavailable.
          </Text>
        </GlassSurface>
      ) : null}

      {busy ? (
        <View style={{ paddingVertical: 16, alignItems: "center" }}>
          <MessageLoading size="lg" />
        </View>
      ) : null}

      {mode === "objective_test" ? (
        <View style={{ gap: 10 }}>
          <View>
            <Text style={{ color: palette.colors.textSecondary, marginBottom: 6, fontWeight: "700", fontSize: 12 }}>
              Timer
            </Text>
            <GlassSegmentedControl
              value={timerSetting}
              options={[
                { value: "20", label: "20 min" },
                { value: "30", label: "30 min" },
                { value: "no_limit", label: "No Limit" },
              ]}
              onValueChange={(nextValue) => {
                if (nextValue === "20" || nextValue === "30" || nextValue === "no_limit") {
                  setTimerSetting(nextValue);
                }
              }}
              size="sm"
            />
          </View>
          <GlassButton
            variant="solid"
            label="Generate New 25-Question Test"
            onPress={() => void startObjectiveTest()}
          />

          {test ? (
            <>
              <MagicCardScore>
                <Text style={{ color: countdownColor, fontWeight: "900", fontSize: 28, letterSpacing: 1 }}>
                  {timerSetting === "no_limit" ? "No Limit" : formatCountdown(secondsLeft)}
                </Text>
                <Text style={{ color: palette.colors.textSecondary }}>
                  {timerSetting === "no_limit"
                    ? "Untimed mode enabled"
                    : `${test.timeLimitMinutes} minute timer • auto turns red at 25% remaining`}
                </Text>
                <Text style={{ color: palette.colors.textSecondary, marginTop: 6, fontSize: 12 }}>
                  AI generated {new Date(test.generatedAt).toLocaleString()}
                </Text>
              </MagicCardScore>

              <ScrollView contentContainerStyle={{ gap: 10 }}>
                {test.questions.map((question, index) => (
                  <MagicCardQuestion key={question.id}>
                    <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                      {index + 1}. {question.question}
                    </Text>
                    <View style={{ marginTop: 8, gap: 6 }}>
                      {question.options.map((option, optionIndex) => {
                        const selected = testAnswers[question.id] === optionIndex;
                        const isCorrect = optionIndex === question.correctIndex;
                        const isIncorrectSelection =
                          Boolean(testResult) && selected && !isCorrect;
                        const showCorrectState = Boolean(testResult) && isCorrect;
                        const borderColor = showCorrectState
                          ? palette.colors.success
                          : isIncorrectSelection
                            ? palette.colors.danger
                            : selected
                              ? palette.colors.primary
                              : palette.colors.border;
                        const backgroundColor = showCorrectState
                          ? palette.colors.successGlass
                          : isIncorrectSelection
                            ? palette.colors.dangerGlass
                            : selected
                              ? palette.colors.primarySoft
                              : palette.colors.surface;
                        const answerPrefix = String.fromCharCode(65 + optionIndex);
                        const statusSuffix = !testResult
                          ? ""
                          : showCorrectState
                            ? "  • Correct"
                            : isIncorrectSelection
                              ? "  • Incorrect"
                              : "";
                        return (
                          <Pressable
                            key={`${question.id}_${optionIndex}`}
                            disabled={Boolean(testResult)}
                            onPress={() => setTestAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))}
                          >
                            <GlassSurface
                              style={{
                                padding: 10,
                                borderColor,
                                backgroundColor,
                              }}
                            >
                              <Text style={{ color: palette.colors.text }}>
                                {answerPrefix}. {option}
                                {statusSuffix}
                              </Text>
                            </GlassSurface>
                          </Pressable>
                        );
                      })}
                    </View>
                    {testResult ? (
                      <Text style={{ color: palette.colors.textSecondary, marginTop: 8 }}>
                        {testAnswers[question.id] === question.correctIndex ? "You got this right." : `Correct answer: ${String.fromCharCode(65 + question.correctIndex)}.`}{" "}
                        {question.explanation}
                      </Text>
                    ) : null}
                  </MagicCardQuestion>
                ))}
              </ScrollView>

              <GlassButton
                variant="solid"
                label={submittingTest ? "Submitting..." : "Submit Test"}
                disabled={submittingTest}
                onPress={() => void submitObjectiveTest()}
              />

              {testResult ? (
                <MagicCardScore>
                  <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 22 }}>
                    Score: {testResult.score}/{testResult.max}
                  </Text>
                  <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
                    Percentage: {Math.round((testResult.score / testResult.max) * 100)}%
                  </Text>
                  <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
                    Answered: {Object.keys(testAnswers).length}/{test.questions.length}
                  </Text>
                </MagicCardScore>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      {mode === "presentation" ? (
        <View style={{ gap: 10 }}>
          <GlassButton variant="solid" label="Generate Scenario" onPress={() => void generateScenario()} />

          {scenario ? (
            <MagicCardQuestion>
              <Text style={{ color: palette.colors.text, fontWeight: "800" }}>{scenario.title}</Text>
              <Text style={{ color: palette.colors.textSecondary, marginTop: 6 }}>{scenario.scenario}</Text>
              <Text style={{ color: palette.colors.textSecondary, marginTop: 6 }}>
                Time limit: {scenario.timeLimitMinutes} min
              </Text>
              {scenario.generatedAt ? (
                <Text style={{ color: palette.colors.textSecondary, marginTop: 6, fontSize: 12 }}>
                  AI generated {new Date(scenario.generatedAt).toLocaleString()}
                </Text>
              ) : null}
              <View style={{ marginTop: 8 }}>
                {scenario.keyExpectations.map((item) => (
                  <Text key={item} style={{ color: palette.colors.textSecondary, marginBottom: 4 }}>
                    • {item}
                  </Text>
                ))}
              </View>
            </MagicCardQuestion>
          ) : null}

          <View style={{ flexDirection: "row", gap: 8 }}>
            {!recordingActive ? (
              <Pressable style={{ flex: 1 }} onPress={() => void startRecording()}>
                {({ pressed }) => (
                  <GlassSurface pressed={pressed} style={{ padding: 12, alignItems: "center" }}>
                    <Text style={{ color: palette.colors.text, fontWeight: "700" }}>Start Recording</Text>
                  </GlassSurface>
                )}
              </Pressable>
            ) : (
              <Pressable style={{ flex: 1 }} onPress={() => void stopRecording()}>
                {({ pressed }) => (
                  <GlassSurface
                    pressed={pressed}
                    tone="danger"
                    elevation={3}
                    style={{ padding: 12, alignItems: "center", borderColor: palette.colors.danger }}
                  >
                    <Text style={{ color: palette.colors.danger, fontWeight: "700" }}>Stop Recording</Text>
                  </GlassSurface>
                )}
              </Pressable>
            )}
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Badge variant={recordingActive ? "red" : "gray-subtle"} size="md" capitalize={false}>
                {recordingActive ? "Recording..." : recordingUri ? "Recorded" : "Not recorded"}
              </Badge>
            </View>
          </View>

          <GlassInput
            multiline
            value={presentationNotes}
            onChangeText={setPresentationNotes}
            label="Notes from your response"
            placeholder="Summarize what you said so Finn can coach you against the rubric."
            inputWrapperStyle={{ minHeight: 120, borderRadius: 18 }}
          />

          <GlassButton variant="solid" label="Analyze My Response" onPress={() => void runPresentationFeedback()} />

          {presentationFeedback ? (
            <MagicCardScore>
              <Text style={{ color: palette.colors.text, fontWeight: "800" }}>
                Score: {presentationFeedback.totalScore}/{presentationFeedback.maxScore}
              </Text>
              <Text style={{ color: palette.colors.textSecondary, marginTop: 6 }}>
                {presentationFeedback.summary}
              </Text>
              <View style={{ marginTop: 8 }}>
                {presentationFeedback.rubric.map((row) => (
                  <Text key={row.criterion} style={{ color: palette.colors.textSecondary, marginBottom: 4 }}>
                    • {row.criterion}: {row.score}/{row.maxScore} — {row.feedback}
                  </Text>
                ))}
              </View>
            </MagicCardScore>
          ) : null}
        </View>
      ) : null}

      {mode === "flashcards" ? (
        <View style={{ gap: 10 }}>
          <GlassButton variant="solid" label="Generate Flashcard Deck" onPress={() => void loadFlashcards()} />

          {cards.length > 0 ? (
            <>
              <MagicCardFlashcard contentStyle={{ minHeight: 180, justifyContent: "center" }}>
                <Text style={{ color: palette.colors.textSecondary, marginBottom: 8 }}>
                  Card {cardIndex + 1} / {cards.length}
                </Text>
                <Text style={{ color: palette.colors.text, fontWeight: "800", fontSize: 18 }}>
                  {cardBackVisible ? cards[cardIndex].back : cards[cardIndex].front}
                </Text>
                {cardBackVisible && cards[cardIndex].memoryTip ? (
                  <Text style={{ color: palette.colors.textSecondary, marginTop: 10 }}>
                    Memory tip: {cards[cardIndex].memoryTip}
                  </Text>
                ) : null}
                {cards[cardIndex].generatedAt ? (
                  <Text style={{ color: palette.colors.textSecondary, marginTop: 8, fontSize: 12 }}>
                    AI generated {new Date(cards[cardIndex].generatedAt as string).toLocaleString()}
                  </Text>
                ) : null}
              </MagicCardFlashcard>

              <GlassButton
                variant="primary"
                label={cardBackVisible ? "Show Front" : "Show Back"}
                onPress={() => setCardBackVisible((prev) => !prev)}
              />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <GlassButton variant="ghost" label="Review Again" onPress={() => void markCard("review")} />
                </View>
                <View style={{ flex: 1 }}>
                  <GlassButton variant="solid" label="Known" onPress={() => void markCard("known")} />
                </View>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {mode === "mock_judge" ? (
        <View style={{ gap: 10 }}>
          <GlassInput
            multiline
            value={mockSubmission}
            onChangeText={setMockSubmission}
            label="Project / presentation summary"
            placeholder="Paste your summary, outline, or response and Finn will score it by rubric criteria."
            inputWrapperStyle={{ minHeight: 140, borderRadius: 18 }}
          />

          <GlassButton variant="solid" label="Run Mock Judge" onPress={() => void runMockJudge()} />

          {mockResult ? (
            <MagicCardScore>
              <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 20 }}>
                {mockResult.totalScore}/{mockResult.maxScore}
              </Text>
              <Text style={{ color: palette.colors.textSecondary, marginTop: 6 }}>
                {mockResult.summary}
              </Text>

              <View style={{ marginTop: 8 }}>
                {mockResult.rubric.map((row) => (
                  <Text key={row.criterion} style={{ color: palette.colors.textSecondary, marginBottom: 4 }}>
                    • {row.criterion}: {row.score}/{row.maxScore}
                  </Text>
                ))}
              </View>

              <View style={{ marginTop: 8 }}>
                {mockResult.judgeTips.map((tip) => (
                  <Text key={tip} style={{ color: palette.colors.textSecondary, marginBottom: 4 }}>
                    • {tip}
                  </Text>
                ))}
              </View>
            </MagicCardScore>
          ) : null}
        </View>
      ) : null}

      <MagicCardRubric style={{ marginTop: 14 }}>
        <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 6 }}>
          Judging Criteria Snapshot
        </Text>
        {event.judgingCriteria.map((criterion) => (
          <Text key={criterion} style={{ color: palette.colors.textSecondary, marginBottom: 4 }}>
            • {criterion}
          </Text>
        ))}
      </MagicCardRubric>

      <MagicCardRubric style={{ marginTop: 10 }}>
        <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 6 }}>
          Topic Areas
        </Text>
        {event.topicAreas.map((topic) => (
          <Text key={topic} style={{ color: palette.colors.textSecondary, marginBottom: 4 }}>
            • {topic}
          </Text>
        ))}
      </MagicCardRubric>

      <MagicCardRubric style={{ marginTop: 10 }}>
        <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 6 }}>
          Score History
        </Text>
        {history.length === 0 ? (
          <Text style={{ color: palette.colors.textSecondary }}>
            No saved attempts yet for this event.
          </Text>
        ) : (
          history.map((item) => {
            const pct = item.maxScore > 0 ? Math.round((item.score / item.maxScore) * 100) : 0;
            return (
              <View key={item.id} style={{ marginBottom: 8 }}>
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                  {item.mode.replaceAll("_", " ")} • {pct}%
                </Text>
                <Text style={{ color: palette.colors.textSecondary }}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
            );
          })
        )}
      </MagicCardRubric>

      {FBLA_EVENT_DEFINITIONS.length === 0 ? (
        <EmptyState title="No event data" message="Event catalog is unavailable." />
      ) : null}
    </ScreenShell>
  );
}








