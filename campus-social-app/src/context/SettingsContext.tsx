import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { useAuthContext } from "./AuthContext";
import { useAccessibility } from "./AccessibilityContext";
import { useThemeContext } from "./ThemeContext";
import { db } from "../config/firebase";
import { AppSettings } from "../types/settings";
import { configurePracticeReminders, setGlobalPushSuppressed } from "../services/pushService";
import {
  cacheSettings,
  createDefaultSettings,
  fetchSettingsOnce,
  getCachedSettings,
  saveSettings,
  subscribeSettings,
} from "../services/settingsService";

type SettingsContextValue = {
  settings: AppSettings;
  ready: boolean;
  updateSettings: (updater: (previous: AppSettings) => AppSettings) => Promise<void>;
  resetSettings: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { uid } = useAuthContext();
  const { setThemeName } = useThemeContext();
  const {
    setFontScale,
    setHighContrastMode,
    setReduceAnimations,
    setBoldText,
    setScreenReaderHints,
  } = useAccessibility();
  const [settings, setSettings] = useState<AppSettings>(createDefaultSettings());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!uid) {
      setSettings(createDefaultSettings());
      setReady(true);
      return;
    }

    let mounted = true;
    let hasServerSnapshot = false;

    const bootstrap = async () => {
      try {
        const cached = await getCachedSettings(uid);
        if (cached && mounted) {
          setSettings(cached);
          await setThemeName(cached.appearance.themeName);
        }
      } catch (error) {
        console.warn("Settings bootstrap from cache failed:", error);
      } finally {
        if (mounted) {
          setReady(true);
        }
      }

      try {
        const server = await fetchSettingsOnce(uid);
        if (!mounted) {
          return;
        }
        hasServerSnapshot = true;
        setSettings(server);
        await cacheSettings(uid, server);
        await setThemeName(server.appearance.themeName);
      } catch (error) {
        console.warn("Settings bootstrap from Firestore failed:", error);
      }
    };

    void bootstrap();

    const unsubscribe = subscribeSettings(
      uid,
      (next) => {
        hasServerSnapshot = true;
        setSettings(next);
        void cacheSettings(uid, next);
        void setThemeName(next.appearance.themeName);
      },
      (error) => {
        if (!hasServerSnapshot) {
          console.warn("Settings subscription failed:", error);
        }
      },
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [uid, setThemeName]);

  useEffect(() => {
    setFontScale(settings.accessibility.textScale);
    setHighContrastMode(settings.accessibility.highContrastMode);
    setReduceAnimations(settings.accessibility.reduceAnimations);
    setBoldText(settings.accessibility.boldText);
    setScreenReaderHints(settings.accessibility.screenReaderHints);
  }, [
    setBoldText,
    setFontScale,
    setHighContrastMode,
    setReduceAnimations,
    setScreenReaderHints,
    settings.accessibility.boldText,
    settings.accessibility.highContrastMode,
    settings.accessibility.reduceAnimations,
    settings.accessibility.screenReaderHints,
    settings.accessibility.textScale,
  ]);

  useEffect(() => {
    void setGlobalPushSuppressed(!settings.notifications.globalPush);
  }, [settings.notifications.globalPush]);

  useEffect(() => {
    if (!uid) {
      void configurePracticeReminders(false);
      return;
    }
    const shouldEnableReminders =
      settings.notifications.globalPush && settings.notifications.practiceReminders;
    void configurePracticeReminders(shouldEnableReminders);
  }, [uid, settings.notifications.globalPush, settings.notifications.practiceReminders]);

  const syncUserPrivacyFields = async (next: AppSettings): Promise<void> => {
    if (!uid) {
      return;
    }
    await setDoc(
      doc(db, "users", uid),
      {
        profileVisibility: next.privacy.profileVisibility,
        showOnlineStatus: next.privacy.showOnlineStatus,
        showMood: next.privacy.showMood,
        allowFriendSuggestions: next.privacy.allowFriendSuggestions,
        settingsUpdatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const updateSettings = async (
    updater: (previous: AppSettings) => AppSettings,
  ): Promise<void> => {
    if (!uid) {
      return;
    }

    const next = updater(settings);
    setSettings(next);
    await cacheSettings(uid, next);
    await setThemeName(next.appearance.themeName);
    await saveSettings(uid, next);
    await syncUserPrivacyFields(next);
  };

  const resetSettings = async (): Promise<void> => {
    if (!uid) {
      return;
    }
    const defaults = createDefaultSettings();
    setSettings(defaults);
    await cacheSettings(uid, defaults);
    await setThemeName(defaults.appearance.themeName);
    await saveSettings(uid, defaults);
    await syncUserPrivacyFields(defaults);
  };

  const value = useMemo(
    () => ({
      settings,
      ready,
      updateSettings,
      resetSettings,
    }),
    [ready, resetSettings, settings, updateSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}
