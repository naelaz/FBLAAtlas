import { NavigatorScreenParams } from "@react-navigation/native";

import { FeedItem } from "../types/feed";

export type MainTabParamList = {
  Home: undefined;
  PracticeTab: undefined;
  Finn: undefined;
  Messages: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  AnnouncementDetail: { item: FeedItem };
  EventDetail: { eventId: string };
  Events: undefined;
  Profile: { openEdit?: boolean } | undefined;
  Practice: undefined;
  PracticeEventHub: {
    eventId: string;
    mode?: "objective_test" | "presentation" | "flashcards" | "mock_judge";
    challengeId?: string;
  };
  Notifications: undefined;
  Leaderboard: undefined;
  Finn: undefined;
  Settings: undefined;
  MyConferences: undefined;
  AdminDashboard: undefined;
  Chat: { conversationId: string; targetUserId?: string };
  CreatePost: undefined;
  StudentProfile: { userId: string };
  JoinChapter: undefined;
  ChallengeMembers: { eventId: string; eventName: string };
  StudySession: { sessionId: string };
  Glossary: undefined;
  OfficerTasks: undefined;
  RoommateFinder: { level: "DLC" | "SLC" | "NLC" };
  Search: undefined;
  EventGuidelines: { url: string; title: string };
};
