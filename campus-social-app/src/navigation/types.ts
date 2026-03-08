import { FeedItem } from "../types/feed";

export type RootStackParamList = {
  MainTabs: undefined;
  AnnouncementDetail: { item: FeedItem };
  EventDetail: { eventId: string };
  Notifications: undefined;
  Leaderboard: undefined;
  Finn: undefined;
  Settings: undefined;
  Chat: { conversationId: string; targetUserId?: string };
  CreatePost: undefined;
  StudentProfile: { userId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Events: undefined;
  Finn: undefined;
  Messages: undefined;
  Profile: undefined;
};
