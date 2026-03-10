export type ChallengeStatus = "pending" | "accepted" | "declined" | "expired" | "active" | "completed";

export type PracticeChallenge = {
  id: string;
  chapterId: string;
  schoolId: string;
  eventId: string;
  eventName: string;
  challengerUid: string;
  challengerName: string;
  targetUid: string;
  targetName: string;
  status: ChallengeStatus;
  createdAt: string;
  expiresAt: string;
  startedAt?: string;
  completedAt?: string;
  challengerScore?: number;
  targetScore?: number;
  challengerCorrect?: number;
  targetCorrect?: number;
  winnerUid?: string;
};

export type DuelLeaderboardRow = {
  uid: string;
  name: string;
  wins: number;
  losses: number;
  totalDuels: number;
  winRate: number;
};

export type RecognitionPlacement = {
  id: string;
  chapterId: string;
  schoolId: string;
  uid: string;
  userName: string;
  eventName: string;
  place: "1st" | "2nd" | "3rd" | "Top 10" | "Top 20" | "Qualified" | "Participant";
  level: "DLC" | "SLC" | "NLC";
  year: number;
  verified: boolean;
  pending: boolean;
  reactions: Record<string, number>;
  createdAt: string;
  verifiedBy?: string;
};

export type ChapterEventItem = {
  id: string;
  chapterId: string;
  schoolId: string;
  title: string;
  description: string;
  location: string;
  dateTime: string;
  mandatory: boolean;
  rsvpEnabled: boolean;
  attendeeIds: string[];
  capacity?: number;
  createdByUid: string;
  createdByName: string;
  createdAt: string;
};

export type MeetingActionItem = {
  id: string;
  text: string;
  assigneeUid: string;
  assigneeName: string;
  dueDate: string;
  done: boolean;
};

export type MeetingNote = {
  id: string;
  chapterId: string;
  schoolId: string;
  meetingDate: string;
  agenda: string[];
  decisions: string[];
  attendees: Array<{ uid: string; name: string }>;
  actionItems: MeetingActionItem[];
  createdByUid: string;
  createdByName: string;
  createdAt: string;
};

export type StudySessionMode = "practice_together" | "quiz_each_other";

export type StudySession = {
  id: string;
  chapterId: string;
  schoolId: string;
  eventIds: string[];
  eventNames: string[];
  description: string;
  maxParticipants: number;
  isChapterOnly: boolean;
  mode: StudySessionMode;
  createdByUid: string;
  createdByName: string;
  participantIds: string[];
  startedAt: string;
  scheduledFor?: string;
  endedAt?: string;
  status: "active" | "ended";
};

export type StudySessionMessage = {
  id: string;
  sessionId: string;
  uid: string;
  name: string;
  text: string;
  createdAt: string;
};

export type RoommatePreference = {
  uid: string;
  chapterId: string;
  conferenceLevel: "DLC" | "SLC" | "NLC";
  sleepSchedule: string;
  noiseLevel: string;
  tidiness: string;
  studyPreference: string;
  genderPreference: string;
  note: string;
  createdAt: string;
};

export type RoommateMatch = {
  id: string;
  conferenceLevel: "DLC" | "SLC" | "NLC";
  uidA: string;
  uidB: string;
  createdAt: string;
};

export type ChapterGoal = {
  id: string;
  chapterId: string;
  schoolId: string;
  title: string;
  target: number;
  unit: string;
  deadline: string;
  category: string;
  progress: number;
  createdByUid: string;
  createdByName: string;
  createdAt: string;
};

export type GoalContribution = {
  id: string;
  goalId: string;
  chapterId: string;
  uid: string;
  userName: string;
  amount: number;
  note: string;
  approved: boolean;
  createdAt: string;
  approvedBy?: string;
};

export type DuesRecord = {
  uid: string;
  paid: boolean;
  updatedAt: string;
};

export type ChapterDuesSettings = {
  amount: number;
  deadline: string;
  paymentLink: string;
};

export type OfficerTask = {
  id: string;
  chapterId: string;
  schoolId: string;
  title: string;
  description: string;
  assigneeUid: string;
  assigneeName: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "done";
  checklist: Array<{ id: string; text: string; done: boolean }>;
  commentsCount: number;
  createdByUid: string;
  createdByName: string;
  createdAt: string;
};

export type AlumniMentorRequest = {
  id: string;
  mentorUid: string;
  requesterUid: string;
  requesterName: string;
  eventAreas: string[];
  message: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

export type ConferenceItineraryItem = {
  id: string;
  uid: string;
  conferenceLevel: "DLC" | "SLC" | "NLC";
  title: string;
  type: "competition" | "official" | "personal";
  startAt: string;
  endAt: string;
  location?: string;
  notes?: string;
};

