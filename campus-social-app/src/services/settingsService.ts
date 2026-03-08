import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Unsubscribe,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { APP_THEMES, DEFAULT_THEME } from "../constants/themes";
import { AppSettings } from "../types/settings";
import { toIso } from "./firestoreUtils";

function settingsStorageKey(uid: string): string {
  return `fbla_atlas_settings_${uid}_v1`;
}

export function createDefaultSettings(): AppSettings {
  return {
    notifications: {
      globalPush: true,
      likes: true,
      comments: true,
      follows: true,
      events: true,
      xp: true,
      streaks: true,
      news: true,
      sound: true,
    },
    accessibility: {
      textScale: 1,
      highContrastMode: false,
      reduceAnimations: false,
      boldText: false,
      screenReaderHints: true,
    },
    appearance: {
      themeName: DEFAULT_THEME,
      modeOverride: "system",
    },
    privacy: {
      profileVisibility: "school",
      showOnlineStatus: true,
      showMood: true,
      allowFriendSuggestions: true,
      blockedUserIds: [],
    },
    account: {
      connectedGoogle: true,
      connectedApple: false,
    },
  };
}

function coerceThemeName(value: unknown): AppSettings["appearance"]["themeName"] {
  const raw = typeof value === "string" ? value : DEFAULT_THEME;
  return APP_THEMES.some((theme) => theme.name === raw)
    ? (raw as AppSettings["appearance"]["themeName"])
    : DEFAULT_THEME;
}

function parseSettings(data: Record<string, unknown>): AppSettings {
  const base = createDefaultSettings();
  const notifications =
    typeof data.notifications === "object" && data.notifications !== null
      ? (data.notifications as Record<string, unknown>)
      : {};
  const accessibility =
    typeof data.accessibility === "object" && data.accessibility !== null
      ? (data.accessibility as Record<string, unknown>)
      : {};
  const appearance =
    typeof data.appearance === "object" && data.appearance !== null
      ? (data.appearance as Record<string, unknown>)
      : {};
  const privacy =
    typeof data.privacy === "object" && data.privacy !== null
      ? (data.privacy as Record<string, unknown>)
      : {};
  const account =
    typeof data.account === "object" && data.account !== null
      ? (data.account as Record<string, unknown>)
      : {};

  return {
    notifications: {
      globalPush:
        typeof notifications.globalPush === "boolean"
          ? notifications.globalPush
          : base.notifications.globalPush,
      likes:
        typeof notifications.likes === "boolean"
          ? notifications.likes
          : base.notifications.likes,
      comments:
        typeof notifications.comments === "boolean"
          ? notifications.comments
          : base.notifications.comments,
      follows:
        typeof notifications.follows === "boolean"
          ? notifications.follows
          : base.notifications.follows,
      events:
        typeof notifications.events === "boolean"
          ? notifications.events
          : base.notifications.events,
      xp:
        typeof notifications.xp === "boolean" ? notifications.xp : base.notifications.xp,
      streaks:
        typeof notifications.streaks === "boolean"
          ? notifications.streaks
          : base.notifications.streaks,
      news:
        typeof notifications.news === "boolean"
          ? notifications.news
          : base.notifications.news,
      sound:
        typeof notifications.sound === "boolean"
          ? notifications.sound
          : base.notifications.sound,
    },
    accessibility: {
      textScale:
        typeof accessibility.textScale === "number"
          ? Math.max(0.85, Math.min(1.3, accessibility.textScale))
          : base.accessibility.textScale,
      highContrastMode:
        typeof accessibility.highContrastMode === "boolean"
          ? accessibility.highContrastMode
          : base.accessibility.highContrastMode,
      reduceAnimations:
        typeof accessibility.reduceAnimations === "boolean"
          ? accessibility.reduceAnimations
          : base.accessibility.reduceAnimations,
      boldText:
        typeof accessibility.boldText === "boolean"
          ? accessibility.boldText
          : base.accessibility.boldText,
      screenReaderHints:
        typeof accessibility.screenReaderHints === "boolean"
          ? accessibility.screenReaderHints
          : base.accessibility.screenReaderHints,
    },
    appearance: {
      themeName: coerceThemeName(appearance.themeName),
      modeOverride:
        appearance.modeOverride === "light" ||
        appearance.modeOverride === "dark" ||
        appearance.modeOverride === "system"
          ? appearance.modeOverride
          : base.appearance.modeOverride,
    },
    privacy: {
      profileVisibility:
        privacy.profileVisibility === "friends" ||
        privacy.profileVisibility === "private" ||
        privacy.profileVisibility === "school"
          ? privacy.profileVisibility
          : base.privacy.profileVisibility,
      showOnlineStatus:
        typeof privacy.showOnlineStatus === "boolean"
          ? privacy.showOnlineStatus
          : base.privacy.showOnlineStatus,
      showMood:
        typeof privacy.showMood === "boolean" ? privacy.showMood : base.privacy.showMood,
      allowFriendSuggestions:
        typeof privacy.allowFriendSuggestions === "boolean"
          ? privacy.allowFriendSuggestions
          : base.privacy.allowFriendSuggestions,
      blockedUserIds: Array.isArray(privacy.blockedUserIds)
        ? privacy.blockedUserIds.filter((item): item is string => typeof item === "string")
        : base.privacy.blockedUserIds,
    },
    account: {
      connectedGoogle:
        typeof account.connectedGoogle === "boolean"
          ? account.connectedGoogle
          : base.account.connectedGoogle,
      connectedApple:
        typeof account.connectedApple === "boolean"
          ? account.connectedApple
          : base.account.connectedApple,
    },
    updatedAt: toIso(data.updatedAt),
  };
}

function settingsDocRef(uid: string) {
  return doc(db, "users", uid, "settings", "preferences");
}

export async function getCachedSettings(uid: string): Promise<AppSettings | null> {
  try {
    const raw = await AsyncStorage.getItem(settingsStorageKey(uid));
    if (!raw) {
      return null;
    }
    return parseSettings(JSON.parse(raw) as Record<string, unknown>);
  } catch (error) {
    console.warn("Failed to read cached settings:", error);
    return null;
  }
}

export async function cacheSettings(uid: string, settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(settingsStorageKey(uid), JSON.stringify(settings));
  } catch (error) {
    console.warn("Failed to cache settings:", error);
  }
}

export async function fetchSettingsOnce(uid: string): Promise<AppSettings> {
  const snap = await getDoc(settingsDocRef(uid));
  if (!snap.exists()) {
    const defaults = createDefaultSettings();
    await setDoc(settingsDocRef(uid), { ...defaults, updatedAt: serverTimestamp() }, { merge: true });
    return defaults;
  }
  return parseSettings(snap.data() as Record<string, unknown>);
}

export function subscribeSettings(
  uid: string,
  onChange: (settings: AppSettings) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    settingsDocRef(uid),
    (snap) => {
      if (!snap.exists()) {
        const defaults = createDefaultSettings();
        onChange(defaults);
        return;
      }
      onChange(parseSettings(snap.data() as Record<string, unknown>));
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Settings subscription failed:", error);
      }
    },
  );
}

export async function saveSettings(uid: string, settings: AppSettings): Promise<void> {
  await setDoc(
    settingsDocRef(uid),
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await cacheSettings(uid, settings);
}


