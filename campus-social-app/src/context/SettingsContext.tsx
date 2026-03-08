import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useAuthContext } from "./AuthContext";
import { useThemeContext } from "./ThemeContext";
import { AppSettings } from "../types/settings";
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
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { uid } = useAuthContext();
  const { setThemeName } = useThemeContext();
  const [settings, setSettings] = useState<AppSettings>(createDefaultSettings());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!uid) {
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
  };

  const value = useMemo(
    () => ({
      settings,
      ready,
      updateSettings,
    }),
    [settings, ready],
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

