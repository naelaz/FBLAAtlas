import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  Unsubscribe,
} from "firebase/firestore";

import {
  FblaEventDefinition,
  FBLA_EVENT_DEFINITIONS,
  getFblaEventById,
  PracticeDifficulty,
} from "../constants/fblaEvents";
import { db } from "../config/firebase";
import {
  MockJudgeResult,
  PracticeAttempt,
  PracticeDashboardSummary,
  PracticeEventStats,
  PracticeFlashcard,
  PracticeLeaderboardEntry,
  PracticeScenario,
  PracticeTest,
} from "../types/practice";
import { toIso } from "./firestoreUtils";

type PracticeAiFunctionResponse = {
  content?: string;
  output?: string;
  result?: unknown;
  payload?: unknown;
  error?: {
    message?: string;
  };
};

type CachedPayload<T> = {
  generatedAt: string;
  payload: T;
};

const PRACTICE_AI_FUNCTION_URL = process.env.EXPO_PUBLIC_PRACTICE_AI_FUNCTION_URL?.trim() ?? "";
const AI_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const LOCAL_CACHE_PREFIX = "practice_ai_cache";

const DIFFICULTY_LABELS: Record<PracticeDifficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  competition_ready: "Competition Ready",
};

function hasPracticeAiEndpoint(): boolean {
  return Boolean(PRACTICE_AI_FUNCTION_URL);
}

function ensurePracticeAiEndpoint(): string {
  if (!PRACTICE_AI_FUNCTION_URL) {
    throw new Error("Practice AI backend is disabled. Set EXPO_PUBLIC_PRACTICE_AI_FUNCTION_URL in .env.");
  }
  return PRACTICE_AI_FUNCTION_URL;
}

function pickTopic(event: FblaEventDefinition, index: number): string {
  if (event.topicAreas.length === 0) {
    return "Core Concepts";
  }
  return event.topicAreas[index % event.topicAreas.length];
}

function buildFallbackObjectiveTest(
  event: FblaEventDefinition,
  difficulty: PracticeDifficulty,
  questionCount: number,
  timeLimitMinutes: number,
): PracticeTest {
  const generatedAt = new Date().toISOString();
  const stemPatterns = [
    "Which response best shows strong FBLA understanding of",
    "In a timed competition setting, what is the best approach to",
    "Which option would a judge most likely reward when assessing",
    "What should you focus on first when reviewing",
    "Which action most improves performance in",
  ];

  const questions = Array.from({ length: questionCount }, (_, index) => {
    const topic = pickTopic(event, index);
    const stem = stemPatterns[index % stemPatterns.length];
    return {
      id: `${event.id}_fallback_q_${index + 1}`,
      question: `${stem} ${topic} for ${event.name}?`,
      options: [
        `Memorize terms for ${topic} without connecting them to the rubric.`,
        `Explain ${topic} clearly, apply it to a business case, and tie it to a measurable outcome.`,
        `Skip ${topic} and rely on general business knowledge.`,
        `Use vague examples so you can stay flexible during judging.`,
      ],
      correctIndex: 1,
      explanation: `Strong FBLA answers connect ${topic} to event-specific reasoning, rubric language, and a clear business result. That is the standard to practice at the ${DIFFICULTY_LABELS[difficulty]} level.`,
    };
  });

  return {
    eventId: event.id,
    eventName: event.name,
    difficulty,
    generatedAt,
    timeLimitMinutes,
    questions,
  };
}

function buildFallbackScenario(
  event: FblaEventDefinition,
  difficulty: PracticeDifficulty,
): PracticeScenario {
  const primaryTopic = pickTopic(event, 0);
  const secondaryTopic = pickTopic(event, 1);
  return {
    eventId: event.id,
    generatedAt: new Date().toISOString(),
    title: `${event.name} Practice Scenario`,
    scenario: `A student leadership team needs a polished ${event.eventType} for an FBLA audience. Your task is to present a solution that addresses ${primaryTopic} while also proving you can apply ${secondaryTopic} in a realistic business setting. Build a response that is concise, evidence-based, and easy for judges to score.`,
    keyExpectations:
      event.judgingCriteria.length > 0
        ? event.judgingCriteria.slice(0, 6)
        : [
            "Clear structure",
            "Event-specific terminology",
            "Professional delivery",
            "Actionable recommendation",
          ],
    timeLimitMinutes: event.defaultTimeLimitMinutes || 7,
  };
}

function buildFallbackFlashcards(
  event: FblaEventDefinition,
  difficulty: PracticeDifficulty,
): PracticeFlashcard[] {
  const generatedAt = new Date().toISOString();
  return Array.from({ length: 20 }, (_, index) => {
    const topic = pickTopic(event, index);
    return {
      id: `${event.id}_fallback_card_${index + 1}`,
      front: `${event.name}: ${topic}`,
      back: `Define ${topic}, explain why it matters in this event, and give one example you could use in competition.`,
      topic,
      memoryTip: `At the ${DIFFICULTY_LABELS[difficulty]} level, connect ${topic} to a concrete business result.`,
      generatedAt,
    };
  });
}

function buildFallbackMockJudge(
  event: FblaEventDefinition,
  submission: string,
): MockJudgeResult {
  const wordCount = submission.trim().split(/\s+/).filter(Boolean).length;
  const effortScore = Math.max(0, Math.min(1, wordCount / 160));
  const rubric = (event.judgingCriteria.length > 0
    ? event.judgingCriteria
    : ["Content", "Structure", "Professionalism", "Clarity"]
  ).map((criterion, index) => {
    const score = Math.max(6, Math.min(10, 6 + Math.round(effortScore * 4) - (index % 2)));
    return {
      criterion,
      score,
      maxScore: 10,
      feedback:
        score >= 8
          ? `You covered ${criterion.toLowerCase()} with a solid foundation. Add sharper evidence and event language to push this higher.`
          : `Strengthen ${criterion.toLowerCase()} with clearer structure, more specific business detail, and tighter delivery.`,
    };
  });

  const totalScore = rubric.reduce((sum, item) => sum + item.score, 0);
  const maxScore = rubric.reduce((sum, item) => sum + item.maxScore, 0);

  return {
    eventId: event.id,
    eventName: event.name,
    totalScore,
    maxScore,
    rubric,
    summary:
      wordCount > 0
        ? "You have a workable draft. Tighten the structure, name the business impact, and use more event-specific vocabulary."
        : "Start by outlining your opening, core recommendation, and measurable result before asking for judge feedback.",
    judgeTips: [
      "Open with a direct recommendation in the first 20 seconds.",
      "Use the rubric language out loud so judges can track your score.",
      "Close with a measurable business result or next step.",
    ],
  };
}

function parseJsonPayload<T>(raw: string): T {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const match = trimmed.match(/```json([\s\S]*?)```/i) ?? trimmed.match(/```([\s\S]*?)```/);
    if (!match) {
      throw new Error("AI returned invalid JSON payload.");
    }
    return JSON.parse(match[1].trim()) as T;
  }
}

function parsePayloadOrThrow<T>(raw: string): T {
  try {
    return parseJsonPayload<T>(raw);
  } catch {
    throw new Error("Practice AI returned malformed JSON.");
  }
}

function normalizeOptionIndex(value: unknown): number | null {
  if (typeof value === "number" && value >= 0 && value <= 3) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const asNumber = Number(trimmed);
    if (Number.isInteger(asNumber) && asNumber >= 0 && asNumber <= 3) {
      return asNumber;
    }

    const upper = trimmed.toUpperCase();
    if (upper === "A") return 0;
    if (upper === "B") return 1;
    if (upper === "C") return 2;
    if (upper === "D") return 3;
  }

  return null;
}

function resolveCorrectIndex(
  options: string[],
  question: {
    correctIndex?: unknown;
    correct?: unknown;
    correctAnswer?: unknown;
    answer?: unknown;
  },
): number {
  const candidates = [
    question.correctIndex,
    question.correct,
    question.correctAnswer,
    question.answer,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeOptionIndex(candidate);
    if (normalized !== null) {
      return normalized;
    }
  }

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }
    const matchIndex = options.findIndex(
      (option) => option.trim().toLowerCase() === candidate.trim().toLowerCase(),
    );
    if (matchIndex >= 0) {
      return matchIndex;
    }
  }

  return 0;
}

function buildCoachPrompt(): string {
  const catalog = FBLA_EVENT_DEFINITIONS.map(
    (event) => `${event.name} | ${event.category} | ${event.eventType}`,
  ).join("\n");

  return [
    "You are Finn, an expert FBLA competition coach.",
    "You know official FBLA events, judging language, timing expectations, and scoring strategy.",
    "Always stay aligned to FBLA professionalism and practical prep guidance.",
    "When asked to return JSON, return valid JSON only with no markdown.",
    "Event catalog:",
    catalog,
  ].join("\n");
}

async function callPracticeAi(
  messages: Array<{ role: "system" | "user"; content: string }>,
): Promise<string> {
  const endpoint = ensurePracticeAiEndpoint();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task: "practice_ai",
      messages,
    }),
  });

  const payload = (await response.json()) as PracticeAiFunctionResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Practice AI request failed.");
  }

  const nested = payload.result ?? payload.payload;
  if (typeof nested === "string" && nested.trim().length > 0) {
    return nested.trim();
  }
  if (nested && typeof nested === "object") {
    return JSON.stringify(nested);
  }

  if (typeof payload.content === "string" && payload.content.trim().length > 0) {
    return payload.content.trim();
  }
  if (typeof payload.output === "string" && payload.output.trim().length > 0) {
    return payload.output.trim();
  }

  throw new Error("Practice AI response was empty.");
}

function cacheDocRef(
  eventId: string,
  collectionName: "generatedTests" | "generatedFlashcards" | "scenarios",
  cacheKey: string,
) {
  return doc(db, "events", eventId, collectionName, cacheKey);
}

function localCacheKey(
  eventId: string,
  collectionName: "generatedTests" | "generatedFlashcards" | "scenarios",
  cacheKey: string,
): string {
  return `${LOCAL_CACHE_PREFIX}:${eventId}:${collectionName}:${cacheKey}`;
}

function isFresh(generatedAt: string): boolean {
  const timestamp = Date.parse(generatedAt);
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return Date.now() - timestamp <= AI_CACHE_MAX_AGE_MS;
}

async function readFirestoreCache<T>(
  eventId: string,
  collectionName: "generatedTests" | "generatedFlashcards" | "scenarios",
  cacheKey: string,
): Promise<CachedPayload<T> | null> {
  const snap = await getDoc(cacheDocRef(eventId, collectionName, cacheKey));
  if (!snap.exists()) {
    return null;
  }

  const data = snap.data() as Partial<CachedPayload<T>>;
  if (typeof data.generatedAt !== "string" || !data.payload || !isFresh(data.generatedAt)) {
    return null;
  }

  return {
    generatedAt: data.generatedAt,
    payload: data.payload,
  };
}

async function writeFirestoreCache<T>(
  eventId: string,
  collectionName: "generatedTests" | "generatedFlashcards" | "scenarios",
  cacheKey: string,
  payload: T,
): Promise<void> {
  const generatedAt = new Date().toISOString();
  await setDoc(
    cacheDocRef(eventId, collectionName, cacheKey),
    {
      generatedAt,
      payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

async function readLocalCache<T>(
  eventId: string,
  collectionName: "generatedTests" | "generatedFlashcards" | "scenarios",
  cacheKey: string,
  allowStale = false,
): Promise<CachedPayload<T> | null> {
  const raw = await AsyncStorage.getItem(localCacheKey(eventId, collectionName, cacheKey));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CachedPayload<T>>;
    if (typeof parsed.generatedAt !== "string" || !parsed.payload) {
      return null;
    }
    if (!allowStale && !isFresh(parsed.generatedAt)) {
      return null;
    }
    return {
      generatedAt: parsed.generatedAt,
      payload: parsed.payload,
    };
  } catch {
    return null;
  }
}

async function writeLocalCache<T>(
  eventId: string,
  collectionName: "generatedTests" | "generatedFlashcards" | "scenarios",
  cacheKey: string,
  payload: T,
): Promise<void> {
  const cached: CachedPayload<T> = {
    generatedAt: new Date().toISOString(),
    payload,
  };
  await AsyncStorage.setItem(
    localCacheKey(eventId, collectionName, cacheKey),
    JSON.stringify(cached),
  );
}

async function loadCachedContent<T>(
  eventId: string,
  collectionName: "generatedTests" | "generatedFlashcards" | "scenarios",
  cacheKey: string,
): Promise<CachedPayload<T> | null> {
  const firestoreCache = await readFirestoreCache<T>(eventId, collectionName, cacheKey);
  if (firestoreCache) {
    return firestoreCache;
  }
  return readLocalCache<T>(eventId, collectionName, cacheKey);
}

export async function generateObjectiveTest(
  event: FblaEventDefinition,
  difficulty: PracticeDifficulty,
): Promise<PracticeTest> {
  const questionCount = Math.max(1, event.objectiveTest?.questionCount ?? 25);
  const configuredTimeLimitMinutes = Math.max(
    1,
    event.objectiveTest?.timeLimitMinutes ?? event.defaultTimeLimitMinutes,
  );
  const cacheKey = `${difficulty}_v4_q${questionCount}_t${configuredTimeLimitMinutes}`;
  const cached = await loadCachedContent<Pick<PracticeTest, "timeLimitMinutes" | "questions">>(
    event.id,
    "generatedTests",
    cacheKey,
  );

  if (cached) {
    return {
      eventId: event.id,
      eventName: event.name,
      difficulty,
      generatedAt: cached.generatedAt,
      timeLimitMinutes: cached.payload.timeLimitMinutes,
      questions: cached.payload.questions,
    };
  }

  if (!hasPracticeAiEndpoint()) {
    return buildFallbackObjectiveTest(event, difficulty, questionCount, configuredTimeLimitMinutes);
  }

  const system = buildCoachPrompt();
  const user = [
    `Create a ${questionCount}-question FBLA objective test for ${event.name}.`,
    `Difficulty: ${DIFFICULTY_LABELS[difficulty]}.`,
    `Event topic areas: ${event.topicAreas.join(", ")}.`,
    "Return JSON with shape:",
    '{"timeLimitMinutes":number,"questions":[{"question":string,"options":[string,string,string,string],"correctIndex":0-3,"explanation":string}]}.',
    `Use exactly ${questionCount} questions and exactly 4 options per question.`,
  ].join("\n");

  try {
    const content = await callPracticeAi([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);

    const parsed = parsePayloadOrThrow<{
      timeLimitMinutes?: number;
      questions?: Array<{
        question?: string;
        options?: string[];
        correctIndex?: number;
        correct?: string | number;
        correctAnswer?: string | number;
        answer?: string | number;
        explanation?: string;
      }>;
    }>(content);

    const questions = (parsed.questions ?? [])
      .slice(0, questionCount)
      .map((question, index) => {
        const options =
          Array.isArray(question.options) && question.options.length === 4
            ? question.options.map((option) => option.trim())
            : ["Option A", "Option B", "Option C", "Option D"];

        return {
          id: `${event.id}_q_${index + 1}`,
          question: question.question?.trim() || `Question ${index + 1}`,
          options,
          correctIndex: resolveCorrectIndex(options, question),
          explanation: question.explanation?.trim() || "Review this concept in your event guidelines.",
        };
      });

    while (questions.length < questionCount) {
      questions.push({
        id: `${event.id}_q_${questions.length + 1}`,
        question: `Practice placeholder question ${questions.length + 1}`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctIndex: 0,
        explanation: "Review this concept in your event guidelines.",
      });
    }

    const payload = {
      timeLimitMinutes:
        typeof parsed.timeLimitMinutes === "number" && parsed.timeLimitMinutes > 0
          ? parsed.timeLimitMinutes
          : configuredTimeLimitMinutes,
      questions,
    };

    await writeFirestoreCache(event.id, "generatedTests", cacheKey, payload);
    await writeLocalCache(event.id, "generatedTests", cacheKey, payload);

    return {
      eventId: event.id,
      eventName: event.name,
      difficulty,
      generatedAt: new Date().toISOString(),
      ...payload,
    };
  } catch (error) {
    const staleCache = await readLocalCache<Pick<PracticeTest, "timeLimitMinutes" | "questions">>(
      event.id,
      "generatedTests",
      cacheKey,
      true,
    );
    if (staleCache) {
      return {
        eventId: event.id,
        eventName: event.name,
        difficulty,
        generatedAt: staleCache.generatedAt,
        timeLimitMinutes: staleCache.payload.timeLimitMinutes,
        questions: staleCache.payload.questions,
      };
    }
    throw error;
  }
}

export async function generatePresentationScenario(
  event: FblaEventDefinition,
  difficulty: PracticeDifficulty,
): Promise<PracticeScenario> {
  const cacheKey = `${difficulty}_v2`;
  const cached = await loadCachedContent<Pick<PracticeScenario, "title" | "scenario" | "keyExpectations" | "timeLimitMinutes">>(
    event.id,
    "scenarios",
    cacheKey,
  );

  if (cached) {
    return {
      eventId: event.id,
      generatedAt: cached.generatedAt,
      ...cached.payload,
    };
  }

  if (!hasPracticeAiEndpoint()) {
    return buildFallbackScenario(event, difficulty);
  }

  const system = buildCoachPrompt();
  const user = [
    `Generate one realistic ${event.eventType} practice scenario for ${event.name}.`,
    `Difficulty: ${DIFFICULTY_LABELS[difficulty]}.`,
    `Judging criteria focus: ${event.judgingCriteria.join(", ")}.`,
    "Return JSON with shape:",
    '{"title":string,"scenario":string,"keyExpectations":[string],"timeLimitMinutes":number}.',
  ].join("\n");

  try {
    const content = await callPracticeAi([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);

    const parsed = parsePayloadOrThrow<{
      title?: string;
      scenario?: string;
      keyExpectations?: string[];
      timeLimitMinutes?: number;
    }>(content);

    const payload = {
      title: parsed.title?.trim() || `${event.name} Scenario`,
      scenario:
        parsed.scenario?.trim() ||
        `Deliver a polished response aligned to ${event.name} judging expectations.`,
      keyExpectations:
        Array.isArray(parsed.keyExpectations) && parsed.keyExpectations.length > 0
          ? parsed.keyExpectations.slice(0, 8)
          : event.judgingCriteria,
      timeLimitMinutes:
        typeof parsed.timeLimitMinutes === "number" && parsed.timeLimitMinutes > 0
          ? parsed.timeLimitMinutes
          : event.defaultTimeLimitMinutes,
    };

    await writeFirestoreCache(event.id, "scenarios", cacheKey, payload);
    await writeLocalCache(event.id, "scenarios", cacheKey, payload);

    return {
      eventId: event.id,
      generatedAt: new Date().toISOString(),
      ...payload,
    };
  } catch (error) {
    const staleCache = await readLocalCache<Pick<PracticeScenario, "title" | "scenario" | "keyExpectations" | "timeLimitMinutes">>(
      event.id,
      "scenarios",
      cacheKey,
      true,
    );
    if (staleCache) {
      return {
        eventId: event.id,
        generatedAt: staleCache.generatedAt,
        ...staleCache.payload,
      };
    }
    throw error;
  }
}

export async function generateFlashcards(
  event: FblaEventDefinition,
  difficulty: PracticeDifficulty,
): Promise<PracticeFlashcard[]> {
  const cacheKey = `${difficulty}_v2`;
  const cached = await loadCachedContent<PracticeFlashcard[]>(
    event.id,
    "generatedFlashcards",
    cacheKey,
  );

  if (cached) {
    return cached.payload.map((card) => ({ ...card, generatedAt: cached.generatedAt }));
  }

  if (!hasPracticeAiEndpoint()) {
    return buildFallbackFlashcards(event, difficulty);
  }

  const system = buildCoachPrompt();
  const user = [
    `Generate 20 FBLA flashcards for ${event.name}.`,
    `Difficulty: ${DIFFICULTY_LABELS[difficulty]}.`,
    `Topic areas: ${event.topicAreas.join(", ")}.`,
    "Return JSON array of {front:string, back:string, topic:string, memoryTip:string}.",
  ].join("\n");

  try {
    const content = await callPracticeAi([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);

    const parsed = parsePayloadOrThrow<Array<{ front?: string; back?: string; topic?: string; memoryTip?: string }>>(
      content,
    );

    const cards = parsed.slice(0, 20).map((card, index) => ({
      id: `${event.id}_card_${index + 1}`,
      front: card.front?.trim() || `Concept ${index + 1}`,
      back: card.back?.trim() || "Review this concept in official guidelines.",
      topic: card.topic?.trim() || "Core Concepts",
      memoryTip: card.memoryTip?.trim() || "Turn this into a one-sentence elevator explanation.",
    }));

    while (cards.length < 20) {
      cards.push({
        id: `${event.id}_card_${cards.length + 1}`,
        front: `Concept ${cards.length + 1}`,
        back: "Review this concept in official guidelines.",
        topic: "Core Concepts",
        memoryTip: "Say it out loud and teach it to someone else.",
      });
    }

    await writeFirestoreCache(event.id, "generatedFlashcards", cacheKey, cards);
    await writeLocalCache(event.id, "generatedFlashcards", cacheKey, cards);

    const generatedAt = new Date().toISOString();
    return cards.map((card) => ({ ...card, generatedAt }));
  } catch (error) {
    const staleCache = await readLocalCache<PracticeFlashcard[]>(
      event.id,
      "generatedFlashcards",
      cacheKey,
      true,
    );
    if (staleCache) {
      return staleCache.payload.map((card) => ({ ...card, generatedAt: staleCache.generatedAt }));
    }
    throw error;
  }
}

export async function evaluateMockJudge(
  event: FblaEventDefinition,
  submission: string,
): Promise<MockJudgeResult> {
  if (!hasPracticeAiEndpoint()) {
    return buildFallbackMockJudge(event, submission);
  }

  const system = buildCoachPrompt();
  const user = [
    `Evaluate this FBLA submission for ${event.name}.`,
    `Judging criteria: ${event.judgingCriteria.join(", ")}.`,
    "Score fairly and provide actionable feedback.",
    "Return JSON with shape:",
    '{"totalScore":number,"maxScore":number,"rubric":[{"criterion":string,"score":number,"maxScore":number,"feedback":string}],"summary":string,"judgeTips":[string]}.',
    `Submission: ${submission}`,
  ].join("\n");

  const content = await callPracticeAi([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  const parsed = parsePayloadOrThrow<{
    totalScore?: number;
    maxScore?: number;
    rubric?: Array<{
      criterion?: string;
      score?: number;
      maxScore?: number;
      feedback?: string;
    }>;
    summary?: string;
    judgeTips?: string[];
  }>(content);

  const rubricSource =
    Array.isArray(parsed.rubric) && parsed.rubric.length > 0
      ? parsed.rubric
      : event.judgingCriteria.map((criterion) => ({
          criterion,
          score: 8,
          maxScore: 10,
          feedback: "Solid start. Add more event-specific evidence.",
        }));

  const rubric = rubricSource.map((item, index) => ({
    criterion: item.criterion?.trim() || event.judgingCriteria[index] || `Criterion ${index + 1}`,
    score: typeof item.score === "number" ? item.score : 8,
    maxScore: typeof item.maxScore === "number" ? item.maxScore : 10,
    feedback: item.feedback?.trim() || "Solid start. Add more event-specific evidence.",
  }));

  const maxScore = rubric.reduce((sum, row) => sum + row.maxScore, 0) || 100;
  const totalScore = rubric.reduce((sum, row) => sum + row.score, 0);

  return {
    eventId: event.id,
    eventName: event.name,
    totalScore: typeof parsed.totalScore === "number" ? parsed.totalScore : totalScore,
    maxScore: typeof parsed.maxScore === "number" ? parsed.maxScore : maxScore,
    rubric,
    summary:
      parsed.summary?.trim() ||
      "You are on the right track. Tighten structure and quantify impact where possible.",
    judgeTips:
      Array.isArray(parsed.judgeTips) && parsed.judgeTips.length > 0
        ? parsed.judgeTips.slice(0, 6)
        : [
            "Lead with a clear objective.",
            "Use event vocabulary from the rubric.",
            "Close with a measurable business outcome.",
          ],
  };
}

function attemptsCollection(uid: string) {
  return collection(db, "users", uid, "practiceAttempts");
}

function practiceProfileRef(uid: string) {
  return doc(db, "practiceProfiles", uid);
}

function parseAttempt(id: string, uid: string, data: Record<string, unknown>): PracticeAttempt {
  return {
    id,
    uid,
    eventId: typeof data.eventId === "string" ? data.eventId : "",
    eventName: typeof data.eventName === "string" ? data.eventName : "FBLA Event",
    mode:
      data.mode === "objective_test" ||
      data.mode === "presentation_coach" ||
      data.mode === "flashcards" ||
      data.mode === "mock_judge"
        ? data.mode
        : "objective_test",
    score: typeof data.score === "number" ? data.score : 0,
    maxScore: typeof data.maxScore === "number" ? data.maxScore : 100,
    difficulty:
      data.difficulty === "beginner" ||
      data.difficulty === "intermediate" ||
      data.difficulty === "advanced" ||
      data.difficulty === "competition_ready"
        ? data.difficulty
        : undefined,
    createdAt: toIso(data.createdAt),
    metadata:
      typeof data.metadata === "object" && data.metadata !== null
        ? (data.metadata as Record<string, string | number | boolean>)
        : undefined,
  };
}

function calcStreak(attempts: PracticeAttempt[]): number {
  if (attempts.length === 0) {
    return 0;
  }

  const uniqueDays = new Set(
    attempts.map((attempt) => new Date(attempt.createdAt).toISOString().slice(0, 10)),
  );

  let streak = 0;
  const cursor = new Date();
  while (true) {
    const dayKey = cursor.toISOString().slice(0, 10);
    if (!uniqueDays.has(dayKey)) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function buildEventStats(attempts: PracticeAttempt[]): PracticeEventStats[] {
  const grouped = new Map<string, PracticeAttempt[]>();
  for (const attempt of attempts) {
    const list = grouped.get(attempt.eventId) ?? [];
    list.push(attempt);
    grouped.set(attempt.eventId, list);
  }

  return [...grouped.entries()].map(([eventId, list]) => {
    const sorted = [...list].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const totalPct = list.reduce((sum, item) => sum + (item.maxScore ? item.score / item.maxScore : 0), 0);
    const averageScore = Math.round((totalPct / list.length) * 100);
    const bestScore = Math.round(
      Math.max(...list.map((item) => (item.maxScore ? (item.score / item.maxScore) * 100 : 0))),
    );

    return {
      eventId,
      eventName: sorted[0]?.eventName || getFblaEventById(eventId)?.name || "FBLA Event",
      attempts: list.length,
      averageScore,
      bestScore,
      lastPracticedAt: sorted[0]?.createdAt ?? new Date().toISOString(),
    };
  });
}

export function buildPracticeDashboardSummary(attempts: PracticeAttempt[]): PracticeDashboardSummary {
  const eventStats = buildEventStats(attempts).sort((a, b) => b.averageScore - a.averageScore);

  const overallReadiness = eventStats.length
    ? Math.round(eventStats.reduce((sum, item) => sum + item.averageScore, 0) / eventStats.length)
    : 0;

  const weakAreas = [...eventStats].sort((a, b) => a.averageScore - b.averageScore).slice(0, 3);

  return {
    overallReadiness,
    streakDays: calcStreak(attempts),
    totalSessions: attempts.length,
    weakAreas,
    eventStats,
  };
}

async function syncPracticeProfile(uid: string): Promise<void> {
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) {
    return;
  }

  const userData = userSnap.data() as Record<string, unknown>;
  const schoolId = typeof userData.schoolId === "string" ? userData.schoolId : "";
  const displayName = typeof userData.displayName === "string" ? userData.displayName : "Student";
  const avatarUrl = typeof userData.avatarUrl === "string" ? userData.avatarUrl : "";

  const attemptsSnap = await getDocs(
    query(attemptsCollection(uid), orderBy("createdAt", "desc"), limit(300)),
  );
  const attempts = attemptsSnap.docs.map((docSnap) =>
    parseAttempt(docSnap.id, uid, docSnap.data() as Record<string, unknown>),
  );

  const summary = buildPracticeDashboardSummary(attempts);

  const thisWeekStart = new Date();
  thisWeekStart.setHours(0, 0, 0, 0);
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());

  const recent = attempts.filter((attempt) => +new Date(attempt.createdAt) >= +thisWeekStart);
  const older = attempts.filter((attempt) => +new Date(attempt.createdAt) < +thisWeekStart);
  const avgRecent = recent.length
    ? recent.reduce((sum, item) => sum + (item.maxScore ? item.score / item.maxScore : 0), 0) / recent.length
    : 0;
  const avgOlder = older.length
    ? older.reduce((sum, item) => sum + (item.maxScore ? item.score / item.maxScore : 0), 0) / older.length
    : 0;

  const improvementScore = Math.round((avgRecent - avgOlder) * 100);

  await setDoc(
    practiceProfileRef(uid),
    {
      uid,
      schoolId,
      displayName,
      avatarUrl,
      averageScore: summary.overallReadiness,
      totalSessions: summary.totalSessions,
      improvementScore,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function savePracticeAttempt(
  uid: string,
  payload: Omit<PracticeAttempt, "id" | "uid" | "createdAt">,
): Promise<void> {
  await addDoc(attemptsCollection(uid), {
    ...payload,
    createdAt: serverTimestamp(),
  });

  await syncPracticeProfile(uid);
}

export async function fetchPracticeAttempts(
  uid: string,
  eventId?: string,
): Promise<PracticeAttempt[]> {
  const baseQuery = query(attemptsCollection(uid), orderBy("createdAt", "desc"), limit(300));
  const snap = await getDocs(baseQuery);
  const attempts = snap.docs.map((docSnap) =>
    parseAttempt(docSnap.id, uid, docSnap.data() as Record<string, unknown>),
  );
  return eventId ? attempts.filter((attempt) => attempt.eventId === eventId) : attempts;
}

export function subscribePracticeAttempts(
  uid: string,
  onChange: (attempts: PracticeAttempt[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(attemptsCollection(uid), orderBy("createdAt", "desc"), limit(300));
  return onSnapshot(
    q,
    (snap) => {
      const attempts = snap.docs.map((docSnap) =>
        parseAttempt(docSnap.id, uid, docSnap.data() as Record<string, unknown>),
      );
      onChange(attempts);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Practice attempts subscription failed:", error);
      }
    },
  );
}

function parseLeaderboardRow(data: Record<string, unknown>): PracticeLeaderboardEntry {
  return {
    uid: typeof data.uid === "string" ? data.uid : "",
    displayName: typeof data.displayName === "string" ? data.displayName : "Student",
    avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl : "",
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    averageScore: typeof data.averageScore === "number" ? data.averageScore : 0,
    totalSessions: typeof data.totalSessions === "number" ? data.totalSessions : 0,
    improvementScore: typeof data.improvementScore === "number" ? data.improvementScore : 0,
  };
}

export function subscribePracticeLeaderboard(
  schoolId: string,
  onChange: (rows: PracticeLeaderboardEntry[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(db, "practiceProfiles"),
    where("schoolId", "==", schoolId),
    orderBy("averageScore", "desc"),
    limit(25),
  );

  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((docSnap) =>
        parseLeaderboardRow(docSnap.data() as Record<string, unknown>),
      );
      onChange(rows);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Practice leaderboard subscription failed:", error);
      }
    },
  );
}

export function recommendationFromSummary(summary: PracticeDashboardSummary): string[] {
  if (summary.eventStats.length === 0) {
    return [
      "Start with one objective test today.",
      "Add one presentation scenario this week.",
      "Review your weakest concept with flashcards.",
    ];
  }

  const weak = summary.weakAreas.map((area) => area.eventName).slice(0, 3);
  return weak.map((eventName, index) => `Focus ${index + 1}: ${eventName}`);
}
