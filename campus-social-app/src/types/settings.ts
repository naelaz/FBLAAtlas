import { AppThemeName } from "../constants/themes";

export type NotificationSettings = {
  globalPush: boolean;
  eventReminders: boolean;
  practiceReminders: boolean;
  chapterUpdates: boolean;
  messageNotifications: boolean;
  xpAlerts: boolean;
};

export type AccessibilitySettings = {
  textScale: number;
  highContrastMode: boolean;
  reduceAnimations: boolean;
  boldText: boolean;
  screenReaderHints: boolean;
  oneHandedMode: boolean;
  leftHandedMode: boolean;
  hapticIntensity: "off" | "subtle" | "full";
  colorBlindMode: "none" | "deuteranopia" | "protanopia" | "tritanopia";
  focusMode: boolean;
};

export type AppearanceSettings = {
  themeName: AppThemeName;
  modeOverride: "system" | "light" | "dark";
};

export type PrivacySettings = {
  profileVisibility: "school" | "public" | "private";
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


