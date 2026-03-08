import { PracticeDifficulty } from "../constants/fblaEvents";

export type PracticeMode = "objective_test" | "presentation_coach" | "flashcards" | "mock_judge";

export type PracticeQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type PracticeTest = {
  eventId: string;
  eventName: string;
  difficulty: PracticeDifficulty;
  timeLimitMinutes: number;
  generatedAt: string;
  questions: PracticeQuestion[];
};

export type PracticeScenario = {
  eventId: string;
  title: string;
  scenario: string;
  keyExpectations: string[];
  timeLimitMinutes: number;
  generatedAt?: string;
};

export type PracticeFlashcard = {
  id: string;
  front: string;
  back: string;
  topic?: string;
  memoryTip?: string;
  generatedAt?: string;
  confidence?: "known" | "review";
};

export type MockJudgeRubricScore = {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
};

export type MockJudgeResult = {
  eventId: string;
  eventName: string;
  totalScore: number;
  maxScore: number;
  rubric: MockJudgeRubricScore[];
  summary: string;
  judgeTips: string[];
};

export type PracticeAttempt = {
  id: string;
  uid: string;
  eventId: string;
  eventName: string;
  mode: PracticeMode;
  score: number;
  maxScore: number;
  difficulty?: PracticeDifficulty;
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
};

export type PracticeEventStats = {
  eventId: string;
  eventName: string;
  attempts: number;
  bestScore: number;
  averageScore: number;
  lastPracticedAt: string;
};

export type PracticeDashboardSummary = {
  overallReadiness: number;
  streakDays: number;
  totalSessions: number;
  weakAreas: PracticeEventStats[];
  eventStats: PracticeEventStats[];
};

export type PracticeLeaderboardEntry = {
  uid: string;
  displayName: string;
  avatarUrl: string;
  schoolId: string;
  averageScore: number;
  totalSessions: number;
  improvementScore: number;
};

