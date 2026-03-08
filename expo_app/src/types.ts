export type Role = 'Competitor' | 'Chapter Officer' | 'Member' | 'Adviser Assistant';

export interface MemberSession {
  memberId: string;
  email: string;
  token: string;
  createdAt: string;
}

export interface MemberProfile {
  id: string;
  fullName: string;
  email: string;
  chapterRole: Role;
  interests: string[];
  achievementBadges: string[];
  highContrastEnabled: boolean;
  largeTextEnabled: boolean;
  reduceMotionEnabled: boolean;
  readableFontEnabled: boolean;
  largerTouchTargetsEnabled: boolean;
  voiceAssistEnabled: boolean;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  isCompetition: boolean;
}

export interface Reminder {
  eventId: string;
  scheduledAt: string;
  notificationId: string;
}

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  offlineAvailable: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  category: string;
  source: string;
  publishedAt: string;
}

export interface SocialChannel {
  id: string;
  platform: string;
  handle: string;
  appUri: string;
  webUri: string;
  feedUri?: string;
  description: string;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  readableFont: boolean;
  largerTouchTargets: boolean;
  voiceAssist: boolean;
}
