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
import {
  FBLA_EVENT_DEFINITIONS,
  getFblaEventById,
  PracticeDifficulty,
  PracticeHubMode,
  PracticePhaseTiming,
} from "../constants/fblaEvents";
import { useAuthContext } from "../context/AuthContext";
import { useGamification } from "../context/GamificationContext";
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
import { awardPointsToUser } from "../services/gamificationService";
import { hapticWarning } from "../services/haptics";
import { fetchChallengeById, submitChallengeResult } from "../services/challengeService";
import { PracticeChallenge } from "../types/features";
import {
  MockJudgeResult,
  PracticeAttempt,
  PracticeFlashcard,
  PracticeScenario,
  PracticeTest,
} from "../types/practice";
import { ScreenShell } from "../components/ScreenShell";
import { formatRelativeTime } from "../utils/format";

type Props = NativeStackScreenProps<RootStackParamList, "PracticeEventHub">;
type HubMode = PracticeHubMode;

const DIFFICULTIES: PracticeDifficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
  "competition_ready",
];

const MODE_LABELS: Record<HubMode, string> = {
  objective_test: "Test",
  presentation: "Timed Coach",
  flashcards: "Flashcards",
  mock_judge: "Mock Judge",
};

const JOB_INTERVIEW_QUESTIONS = [
  "Tell me about yourself and why you are interested in this role.",
  "Describe a time you demonstrated leadership in FBLA or another team setting.",
  "How would you handle a conflict with a teammate during a project deadline?",
  "What business skill are you currently strongest in, and how did you build it?",
  "Describe a time you had to communicate a difficult idea clearly.",
  "How do you prioritize tasks when you have multiple deadlines?",
  "What is one mistake you made and what did you learn from it?",
  "How would your advisor or teammates describe your work ethic?",
  "What value would you bring to this role in your first 30 days?",
  "Do you have any final questions for the interviewer?",
];

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatPhaseDuration(phase: PracticePhaseTiming): string {
  if (phase.untimed) {
    return "No fixed time";
  }

  const total = Math.max(0, phase.durationSeconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (secs === 0) {
    return `${mins} min`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
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

export function PracticeEventHubScreen({ route, navigation }: Props) {
  const { eventId, mode: modeFromRoute, challengeId } = route.params;
  const { palette } = useThemeContext();
  const { profile, isGuest } = useAuthContext();
  const { handleAwardResult } = useGamification();

  const event = useMemo(() => getFblaEventById(eventId), [eventId]);

  const [mode, setMode] = useState<HubMode>("flashcards");
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>("intermediate");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [test, setTest] = useState<PracticeTest | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState<{ score: number; max: number } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [testPaused, setTestPaused] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

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
  const [challenge, setChallenge] = useState<PracticeChallenge | null>(null);
  const [challengeWinnerUid, setChallengeWinnerUid] = useState<string | null>(null);

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0);
  const [phaseRunning, setPhaseRunning] = useState(false);
  const [phaseFlowComplete, setPhaseFlowComplete] = useState(false);
  const [phaseWarningMessage, setPhaseWarningMessage] = useState<string | null>(null);

  const [jobInterviewStarted, setJobInterviewStarted] = useState(false);
  const [jobInterviewIndex, setJobInterviewIndex] = useState(0);
  const [jobInterviewAnswer, setJobInterviewAnswer] = useState("");
  const [jobInterviewResponses, setJobInterviewResponses] = useState<string[]>([]);
  const [jobInterviewSubmitting, setJobInterviewSubmitting] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const hasAutoSubmittedRef = useRef(false);
  const warnedPhasesRef = useRef<Set<string>>(new Set());

  const phasePlan = useMemo(() => event?.presentationFlow?.phases ?? [], [event]);

  useEffect(() => {
    if (!challengeId) {
      setChallenge(null);
      setChallengeWinnerUid(null);
      return;
    }
    let active = true;
    void fetchChallengeById(challengeId)
      .then((row) => {
        if (!active) {
          return;
        }
        setChallenge(row);
      })
      .catch((loadError) => {
        console.warn("Failed to load challenge:", loadError);
      });
    return () => {
      active = false;
    };
  }, [challengeId]);

  const modeOptions = useMemo(() => {
    if (!event) {
      return [] as Array<{ value: HubMode; label: string }>;
    }
    return event.allowedPracticeModes.map((value) => ({
      value,
      label: MODE_LABELS[value],
    }));
  }, [event]);

  useEffect(() => {
    if (!event) {
      return;
    }
    const requestedMode = modeFromRoute as HubMode | undefined;
    if (requestedMode && event.allowedPracticeModes.includes(requestedMode)) {
      setMode(requestedMode);
      return;
    }
    if (event.allowedPracticeModes.length > 0) {
      setMode(event.allowedPracticeModes[0]);
    }
  }, [event, modeFromRoute]);

  useEffect(() => {
    if (!event) {
      return;
    }
    if (event.allowedPracticeModes.includes(mode)) {
      return;
    }
    setMode(event.allowedPracticeModes[0] ?? "flashcards");
  }, [event, mode]);

  useEffect(() => {
    setPhaseIndex(0);
    setPhaseSecondsLeft(phasePlan[0]?.durationSeconds ?? 0);
    setPhaseRunning(false);
    setPhaseFlowComplete(phasePlan.length === 0);
    setPhaseWarningMessage(null);
    warnedPhasesRef.current.clear();
    setJobInterviewStarted(false);
    setJobInterviewIndex(0);
    setJobInterviewAnswer("");
    setJobInterviewResponses([]);
    setJobInterviewSubmitting(false);
  }, [event?.id, mode, phasePlan]);

  useEffect(() => {
    if (!test || testPaused || secondsLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, test, testPaused]);

  useEffect(() => {
    if (!test || !testResult) {
      return;
    }
    hasAutoSubmittedRef.current = true;
  }, [test, testResult]);

  useEffect(() => {
    if (!test || secondsLeft > 0 || testResult) {
      return;
    }
    if (hasAutoSubmittedRef.current) {
      return;
    }
    hasAutoSubmittedRef.current = true;
    setError("Time is up. Your test was submitted automatically.");
    void submitObjectiveTest();
  }, [secondsLeft, test, testResult]);

  useEffect(() => {
    if (!phaseRunning) {
      return;
    }
    const currentPhase = phasePlan[phaseIndex];
    if (!currentPhase || currentPhase.untimed || currentPhase.durationSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setPhaseSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [phaseRunning, phasePlan, phaseIndex]);

  useEffect(() => {
    if (!phaseRunning) {
      return;
    }
    const currentPhase = phasePlan[phaseIndex];
    if (!currentPhase || currentPhase.untimed || currentPhase.durationSeconds <= 0) {
      return;
    }
    if (phaseSecondsLeft > 0) {
      return;
    }
    if (phaseIndex >= phasePlan.length - 1) {
      setPhaseRunning(false);
      setPhaseFlowComplete(true);
      setPhaseWarningMessage("All official phases complete. Continue to self-evaluation.");
      return;
    }
    const nextIndex = phaseIndex + 1;
    setPhaseIndex(nextIndex);
    setPhaseSecondsLeft(phasePlan[nextIndex].durationSeconds);
    setPhaseWarningMessage(null);
  }, [phaseIndex, phasePlan, phaseRunning, phaseSecondsLeft]);

  useEffect(() => {
    if (!phaseRunning) {
      return;
    }
    const currentPhase = phasePlan[phaseIndex];
    if (!currentPhase || currentPhase.untimed || !currentPhase.minuteWarning) {
      return;
    }
    if (phaseSecondsLeft !== 60) {
      return;
    }
    const warningKey = `${event?.id ?? "event"}_${phaseIndex}`;
    if (warnedPhasesRef.current.has(warningKey)) {
      return;
    }
    warnedPhasesRef.current.add(warningKey);
    setPhaseWarningMessage(`1-minute warning: ${currentPhase.label}`);
    hapticWarning();
  }, [event?.id, phaseIndex, phasePlan, phaseRunning, phaseSecondsLeft]);

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

  const currentPhase = phasePlan[phaseIndex] ?? null;
  const hasOfficialPhaseFlow = phasePlan.length > 0;
  const selfEvaluationUnlocked = !hasOfficialPhaseFlow || phaseFlowComplete;

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
    setTestPaused(false);
    setCurrentQuestionIndex(0);
    hasAutoSubmittedRef.current = false;
    try {
      const next = await generateObjectiveTest(event, difficulty);
      setTest(next);
      setSecondsLeft(next.timeLimitMinutes > 0 ? next.timeLimitMinutes * 60 : 0);
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

      const percentage = test.questions.length > 0 ? (answered / test.questions.length) * 100 : 0;
      const testAward = await awardPointsToUser(profile.uid, "complete_practice_test");
      handleAwardResult(testAward);
      if (percentage >= 90) {
        const bonusAward = await awardPointsToUser(profile.uid, "score_90_bonus");
        handleAwardResult(bonusAward);
      }
      if (percentage === 100) {
        const perfectAward = await awardPointsToUser(profile.uid, "perfect_test_score");
        handleAwardResult(perfectAward);
      }

      if (challengeId) {
        const duelSubmission = await submitChallengeResult(
          challengeId,
          profile.uid,
          Math.round(percentage),
          answered,
        );
        setChallenge(duelSubmission.challenge);
        setChallengeWinnerUid(duelSubmission.winnerUid);

        if (answered > 0) {
          const perCorrect = await awardPointsToUser(
            profile.uid,
            "duel_correct_answer",
            undefined,
            answered * 5,
          );
          handleAwardResult(perCorrect);
        }

        if (duelSubmission.challenge?.status === "completed") {
          if (duelSubmission.winnerUid && duelSubmission.winnerUid === profile.uid) {
            const duelWin = await awardPointsToUser(profile.uid, "duel_win");
            handleAwardResult(duelWin);
          } else {
            const duelLoss = await awardPointsToUser(profile.uid, "duel_loss");
            handleAwardResult(duelLoss);
          }
        }
      }
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

  const startPhaseFlow = () => {
    if (phasePlan.length === 0) {
      return;
    }
    setPhaseIndex(0);
    setPhaseSecondsLeft(phasePlan[0].durationSeconds);
    setPhaseRunning(true);
    setPhaseFlowComplete(false);
    setPhaseWarningMessage(null);
    warnedPhasesRef.current.clear();
  };

  const completeCurrentPhase = () => {
    if (phasePlan.length === 0) {
      return;
    }
    if (phaseIndex >= phasePlan.length - 1) {
      setPhaseRunning(false);
      setPhaseFlowComplete(true);
      setPhaseWarningMessage("All official phases complete. Continue to self-evaluation.");
      return;
    }
    const nextIndex = phaseIndex + 1;
    setPhaseIndex(nextIndex);
    setPhaseSecondsLeft(phasePlan[nextIndex].durationSeconds);
    setPhaseWarningMessage(null);
  };

  const resetPhaseFlow = () => {
    setPhaseIndex(0);
    setPhaseSecondsLeft(phasePlan[0]?.durationSeconds ?? 0);
    setPhaseRunning(false);
    setPhaseFlowComplete(false);
    setPhaseWarningMessage(null);
    warnedPhasesRef.current.clear();
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
        const presentationAward = await awardPointsToUser(profile.uid, "complete_presentation");
        handleAwardResult(presentationAward);
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
      const flashcardAward = await awardPointsToUser(profile.uid, "complete_flashcard_deck");
      handleAwardResult(flashcardAward);
    }
  };

  const startJobInterviewFlow = () => {
    setJobInterviewStarted(true);
    setJobInterviewIndex(0);
    setJobInterviewAnswer("");
    setJobInterviewResponses([]);
    setMockResult(null);
    setError(null);
  };

  const submitJobInterviewAnswer = async () => {
    const trimmed = jobInterviewAnswer.trim();
    if (!trimmed) {
      setError("Enter a response before moving to the next interview question.");
      return;
    }

    setError(null);
    const nextResponses = [...jobInterviewResponses, trimmed];
    const nextIndex = jobInterviewIndex + 1;
    setJobInterviewResponses(nextResponses);
    setJobInterviewAnswer("");

    if (nextIndex < JOB_INTERVIEW_QUESTIONS.length) {
      setJobInterviewIndex(nextIndex);
      return;
    }

    setJobInterviewSubmitting(true);
    const transcript = JOB_INTERVIEW_QUESTIONS.map((question, index) => {
      const answer = nextResponses[index] ?? "";
      return `Q${index + 1}: ${question}\nA${index + 1}: ${answer}`;
    }).join("\n\n");

    try {
      const result = await evaluateMockJudge(
        event,
        `Job interview simulation transcript:\n${transcript}\n\nProvide feedback on professionalism, content quality, and FBLA knowledge.`,
      );
      setMockResult(result);
      setJobInterviewStarted(false);

      if (profile && !isGuest) {
        await savePracticeAttempt(profile.uid, {
          eventId: event.id,
          eventName: event.name,
          mode: "mock_judge",
          score: result.totalScore,
          maxScore: result.maxScore,
          difficulty,
          metadata: {
            interviewQuestions: JOB_INTERVIEW_QUESTIONS.length,
          },
        });
        const mockJudgeAward = await awardPointsToUser(profile.uid, "complete_mock_judge");
        handleAwardResult(mockJudgeAward);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not score interview responses.");
    } finally {
      setJobInterviewSubmitting(false);
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
        const mockJudgeAward = await awardPointsToUser(profile.uid, "complete_mock_judge");
        handleAwardResult(mockJudgeAward);
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
      subtitle={`${event.category} - ${event.teamEvent ? "Team" : "Individual"} - ${event.practiceCategory.replaceAll("_", " ")}`}
    >
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {!isGuest ? (
          <View style={{ flex: 1 }}>
            <GlassButton
              variant="ghost"
              label="Challenge a Member"
              onPress={() =>
                navigation.navigate("ChallengeMembers", {
                  eventId: event.id,
                  eventName: event.name,
                })
              }
            />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <GlassButton
            variant="ghost"
            label="Glossary"
            onPress={() => navigation.navigate("Glossary")}
          />
        </View>
      </View>
      <MagicCardRubric style={{ marginBottom: 12 }}>
        <Text style={{ color: palette.colors.text, fontWeight: "800" }}>Official Quick Reference</Text>
        <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>{event.description}</Text>
        {event.objectiveTest ? (
          <Text style={{ color: palette.colors.textSecondary, marginTop: 6 }}>
            Objective test: {event.objectiveTest.questionCount} questions in {event.objectiveTest.timeLimitMinutes} minutes.
          </Text>
        ) : null}
        {event.presentationFlow ? (
          <Text style={{ color: palette.colors.textSecondary, marginTop: 6 }}>
            Phase flow: {event.presentationFlow.phases.map((item) => `${item.label} (${formatPhaseDuration(item)})`).join(" -> ")}
          </Text>
        ) : null}
        <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
          Guidelines: https://www.fbla-pbl.org/fbla/competitive-events/  Docs: https://www.fbla-pbl.org/docs/
        </Text>
      </MagicCardRubric>

      <View style={{ marginBottom: 10 }}>
        <Text style={{ color: palette.colors.textSecondary, marginBottom: 6, fontWeight: "700", fontSize: 12 }}>
          Practice Mode
        </Text>
        <GlassSegmentedControl
          value={mode}
          options={modeOptions}
          onValueChange={(nextValue) => {
            if (event.allowedPracticeModes.includes(nextValue as HubMode)) {
              setMode(nextValue as HubMode);
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
          {challenge ? (
            <GlassSurface style={{ padding: 10, borderColor: palette.colors.primary }}>
              <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                Head-to-Head Challenge Active
              </Text>
              <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
                {challenge.challengerName} vs {challenge.targetName}
              </Text>
              <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
                Status: {challenge.status}
              </Text>
            </GlassSurface>
          ) : null}

          <GlassButton
            variant="solid"
            label={`Generate ${event.objectiveTest?.questionCount ?? 25}-Question Test`}
            onPress={() => void startObjectiveTest()}
          />

          {test ? (() => {
            const question = test.questions[currentQuestionIndex];
            const answeredCount = Object.keys(testAnswers).length;
            return (
            <>
              <MagicCardScore>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View>
                    <Text style={{ color: countdownColor, fontWeight: "900", fontSize: 28, letterSpacing: 1 }}>
                      {test.timeLimitMinutes > 0 ? formatCountdown(secondsLeft) : "No Limit"}
                    </Text>
                    <Text style={{ color: palette.colors.textSecondary, marginTop: 2, fontSize: 12 }}>
                      {answeredCount}/{test.questions.length} answered
                    </Text>
                  </View>
                  {test.timeLimitMinutes > 0 && !testResult ? (
                    <GlassButton
                      variant="ghost"
                      label={testPaused ? "Resume" : "Pause"}
                      onPress={() => setTestPaused((prev) => !prev)}
                    />
                  ) : null}
                </View>
              </MagicCardScore>

              {testPaused ? (
                <GlassSurface style={{ padding: 20, alignItems: "center", borderColor: palette.colors.warning }}>
                  <Text style={{ color: palette.colors.warning, fontWeight: "700", fontSize: 16 }}>Timer Paused</Text>
                  <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
                    Tap Resume to continue your test.
                  </Text>
                </GlassSurface>
              ) : question ? (
                <>
                  <MagicCardQuestion>
                    <Text style={{ color: palette.colors.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 6 }}>
                      Question {currentQuestionIndex + 1} of {test.questions.length}
                    </Text>
                    <Text style={{ color: palette.colors.text, fontWeight: "700", fontSize: 16 }}>
                      {question.question}
                    </Text>
                    <View style={{ marginTop: 12, gap: 8 }}>
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
                            ? "   Correct"
                            : isIncorrectSelection
                              ? "   Incorrect"
                              : "";
                        return (
                          <Pressable
                            key={`${question.id}_${optionIndex}`}
                            disabled={Boolean(testResult)}
                            onPress={() => {
                              setTestAnswers((prev) => ({ ...prev, [question.id]: optionIndex }));
                              if (!testResult && currentQuestionIndex < test.questions.length - 1) {
                                setTimeout(() => setCurrentQuestionIndex((prev) => prev + 1), 300);
                              }
                            }}
                          >
                            <GlassSurface
                              style={{
                                padding: 12,
                                borderRadius: 14,
                                borderColor,
                                backgroundColor,
                              }}
                            >
                              <Text style={{ color: palette.colors.text, fontSize: 15 }}>
                                {answerPrefix}. {option}
                                {statusSuffix}
                              </Text>
                            </GlassSurface>
                          </Pressable>
                        );
                      })}
                    </View>
                    {testResult ? (
                      <Text style={{ color: palette.colors.textSecondary, marginTop: 10, lineHeight: 20 }}>
                        {testAnswers[question.id] === question.correctIndex ? "You got this right." : `Correct answer: ${String.fromCharCode(65 + question.correctIndex)}.`}{" "}
                        {question.explanation}
                      </Text>
                    ) : null}
                  </MagicCardQuestion>

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <GlassButton
                        variant="ghost"
                        label="Previous"
                        disabled={currentQuestionIndex === 0}
                        onPress={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                      />
                    </View>
                    <Text style={{ color: palette.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
                      {currentQuestionIndex + 1} / {test.questions.length}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <GlassButton
                        variant="ghost"
                        label="Next"
                        disabled={currentQuestionIndex >= test.questions.length - 1}
                        onPress={() => setCurrentQuestionIndex((prev) => Math.min(test.questions.length - 1, prev + 1))}
                      />
                    </View>
                  </View>
                </>
              ) : null}

              {!testResult && !testPaused ? (
                <GlassButton
                  variant="solid"
                  label={submittingTest ? "Submitting..." : `Submit Test (${answeredCount}/${test.questions.length})`}
                  disabled={submittingTest}
                  onPress={() => void submitObjectiveTest()}
                />
              ) : null}

              {testResult ? (
                <MagicCardScore>
                  <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 22 }}>
                    Score: {testResult.score}/{testResult.max}
                  </Text>
                  <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
                    {Math.round((testResult.score / testResult.max) * 100)}%
                  </Text>
                  {challenge?.status === "completed" ? (
                    <>
                      <Text style={{ color: palette.colors.textSecondary, marginTop: 8 }}>
                        Duel: {challenge.challengerName} {challenge.challengerScore ?? 0}% vs {challenge.targetName} {challenge.targetScore ?? 0}%
                      </Text>
                      <Text style={{ color: palette.colors.text, marginTop: 4, fontWeight: "700" }}>
                        {challengeWinnerUid
                          ? challengeWinnerUid === profile?.uid
                            ? "You won this challenge."
                            : "Challenge complete. Keep training for the rematch."
                          : "This challenge ended in a tie."}
                      </Text>
                    </>
                  ) : null}
                </MagicCardScore>
              ) : null}
              {testResult ? (
                <GlassButton
                  variant="ghost"
                  label="Practice Again"
                  onPress={() => void startObjectiveTest()}
                />
              ) : null}
            </>
            );
          })() : null}
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
                  AI generated {formatRelativeTime(scenario.generatedAt)}
                </Text>
              ) : null}
              <View style={{ marginTop: 8 }}>
                {scenario.keyExpectations.map((item) => (
                  <Text key={item} style={{ color: palette.colors.textSecondary, marginBottom: 4 }}>
                     {item}
                  </Text>
                ))}
              </View>
            </MagicCardQuestion>
          ) : null}

          {hasOfficialPhaseFlow ? (
            <MagicCardRubric>
              <Text style={{ color: palette.colors.text, fontWeight: "800" }}>Official Phase Timer</Text>
              <View style={{ marginTop: 8, gap: 6 }}>
                {phasePlan.map((phaseItem, index) => (
                  <View key={`${phaseItem.key}_${index}`} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: index === phaseIndex ? palette.colors.text : palette.colors.textSecondary }}>
                      {index + 1}. {phaseItem.label}
                    </Text>
                    <Text style={{ color: index === phaseIndex ? palette.colors.primary : palette.colors.textSecondary }}>
                      {formatPhaseDuration(phaseItem)}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={{ color: palette.colors.primary, fontWeight: "800", marginTop: 10 }}>
                {currentPhase ? `Current: ${currentPhase.label}` : "No active phase"}
              </Text>
              <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
                {currentPhase?.untimed ? "Judge-managed phase" : formatCountdown(phaseSecondsLeft)}
              </Text>

              <View style={{ marginTop: 10, gap: 8 }}>
                {!phaseRunning ? (
                  <GlassButton
                    variant="solid"
                    label={phaseFlowComplete ? "Restart Official Timer" : "Start Official Timer"}
                    onPress={startPhaseFlow}
                  />
                ) : (
                  <GlassButton variant="ghost" label="Pause Timer" onPress={() => setPhaseRunning(false)} />
                )}

                {phaseRunning && currentPhase?.untimed ? (
                  <GlassButton
                    variant="solid"
                    label="Mark Phase Complete"
                    onPress={completeCurrentPhase}
                  />
                ) : null}

                <GlassButton variant="ghost" label="Reset Phases" onPress={resetPhaseFlow} />
              </View>

              {phaseWarningMessage ? (
                <Text style={{ color: palette.colors.warning, marginTop: 8 }}>{phaseWarningMessage}</Text>
              ) : null}
            </MagicCardRubric>
          ) : null}

          {event.presentationFlow ? (
            <MagicCardRubric>
              <Text style={{ color: palette.colors.text, fontWeight: "800" }}>
                {event.presentationFlow.coachingTitle}
              </Text>
              <View style={{ marginTop: 8 }}>
                {event.presentationFlow.coachingBullets.map((line) => (
                  <Text key={line} style={{ color: palette.colors.textSecondary, marginBottom: 4 }}>
                     {line}
                  </Text>
                ))}
              </View>
            </MagicCardRubric>
          ) : null}

          {!selfEvaluationUnlocked ? (
            <GlassSurface style={{ padding: 10, borderColor: palette.colors.primary }}>
              <Text style={{ color: palette.colors.textSecondary }}>
                Complete all official phases to unlock self-evaluation.
              </Text>
            </GlassSurface>
          ) : (
            <>
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
                label="Self-evaluation notes"
                placeholder="Summarize how you handled the official phases and key speaking points."
                inputWrapperStyle={{ minHeight: 120, borderRadius: 18 }}
              />

              <GlassButton variant="solid" label="Analyze My Response" onPress={() => void runPresentationFeedback()} />
            </>
          )}

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
                     {row.criterion}: {row.score}/{row.maxScore}  {row.feedback}
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
                    AI generated {formatRelativeTime(cards[cardIndex].generatedAt as string)}
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
          {event.practiceCategory === "job_interview" ? (
            <GlassSurface style={{ padding: 10, borderColor: palette.colors.primary }}>
              <Text style={{ color: palette.colors.textSecondary }}>
                Job Interview format: 10-minute prep, then interviewer-led questions with no fixed timer.
              </Text>
            </GlassSurface>
          ) : null}

          {event.practiceCategory === "job_interview" ? (
            <>
              {!jobInterviewStarted ? (
                <GlassButton
                  variant="solid"
                  label="Start Mock Interview (10 Questions)"
                  onPress={startJobInterviewFlow}
                />
              ) : (
                <>
                  <MagicCardQuestion>
                    <Text style={{ color: palette.colors.textSecondary }}>
                      Question {jobInterviewIndex + 1} / {JOB_INTERVIEW_QUESTIONS.length}
                    </Text>
                    <Text style={{ color: palette.colors.text, marginTop: 8, fontWeight: "700" }}>
                      {JOB_INTERVIEW_QUESTIONS[jobInterviewIndex]}
                    </Text>
                  </MagicCardQuestion>

                  <GlassInput
                    multiline
                    value={jobInterviewAnswer}
                    onChangeText={setJobInterviewAnswer}
                    label="Your response"
                    placeholder="Type your interview answer."
                    inputWrapperStyle={{ minHeight: 120, borderRadius: 18 }}
                  />

                  <GlassButton
                    variant="solid"
                    label={jobInterviewSubmitting ? "Submitting..." : jobInterviewIndex === JOB_INTERVIEW_QUESTIONS.length - 1 ? "Finish Interview" : "Next Question"}
                    disabled={jobInterviewSubmitting}
                    onPress={() => void submitJobInterviewAnswer()}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <GlassInput
                multiline
                value={mockSubmission}
                onChangeText={setMockSubmission}
                label="Project / interview response summary"
                placeholder="Paste your summary, outline, or response and Finn will score it by rubric criteria."
                inputWrapperStyle={{ minHeight: 140, borderRadius: 18 }}
              />

              <GlassButton variant="solid" label="Run Mock Judge" onPress={() => void runMockJudge()} />
            </>
          )}

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
                     {row.criterion}: {row.score}/{row.maxScore}
                  </Text>
                ))}
              </View>

              <View style={{ marginTop: 8 }}>
                {mockResult.judgeTips.map((tip) => (
                  <Text key={tip} style={{ color: palette.colors.textSecondary, marginBottom: 4 }}>
                     {tip}
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
             {criterion}
          </Text>
        ))}
      </MagicCardRubric>

      <MagicCardRubric style={{ marginTop: 10 }}>
        <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 6 }}>
          Topic Areas
        </Text>
        {event.topicAreas.map((topic) => (
          <Text key={topic} style={{ color: palette.colors.textSecondary, marginBottom: 4 }}>
             {topic}
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
                  {item.mode.replaceAll("_", " ")}  {pct}%
                </Text>
                <Text style={{ color: palette.colors.textSecondary }}>
                  {formatRelativeTime(item.createdAt)}
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





