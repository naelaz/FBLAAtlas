import { AppThemeName } from "../constants/themes";

export type NotificationSettings = {
  globalPush: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  events: boolean;
  xp: boolean;
  streaks: boolean;
  news: boolean;
  sound: boolean;
};

export type AccessibilitySettings = {
  textScale: number;
  highContrastMode: boolean;
  reduceAnimations: boolean;
  boldText: boolean;
  screenReaderHints: boolean;
};

export type AppearanceSettings = {
  themeName: AppThemeName;
  modeOverride: "system" | "light" | "dark";
};

export type PrivacySettings = {
  profileVisibility: "school" | "friends" | "private";
  showOnlineStatus: boolean;
  showMood: boolean;
  allowFriendSuggestions: boolean;
  blockedUserIds: string[];
};

export type AccountSettings = {
  connectedGoogle: boolean;
  connectedApple: boolean;
};

export type CustomizeSettings = {
  widgetDensity: "comfortable" | "compact" | "spacious";
  showStoriesBar: boolean;
  showCampusPulse: boolean;
  showSocialFeed: boolean;
};

export type AppSettings = {
  notifications: NotificationSettings;
  accessibility: AccessibilitySettings;
  appearance: AppearanceSettings;
  privacy: PrivacySettings;
  account: AccountSettings;
  customize: CustomizeSettings;
  updatedAt?: string;
};


