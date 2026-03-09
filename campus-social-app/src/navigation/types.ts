import { FeedItem } from "../types/feed";

export type RootStackParamList = {
  MainTabs: undefined;
  AnnouncementDetail: { item: FeedItem };
  EventDetail: { eventId: string };
  Practice: undefined;
  PracticeEventHub: { eventId: string; mode?: "objective_test" | "presentation" | "flashcards" | "mock_judge" };
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
};

export type MainTabParamList = {
  Home: undefined;
  Events: undefined;
  Finn: undefined;
  Messages: undefined;
  Profile: undefined;
  SettingsTab: undefined;
};

