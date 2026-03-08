import AsyncStorage from "@react-native-async-storage/async-storage";
import * as NavigationBar from "expo-navigation-bar";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MD3Theme } from "react-native-paper";

import {
  APP_THEMES,
  AppThemeName,
  ThemePalette,
  createNavigationTheme,
  createPaperTheme,
  DEFAULT_THEME,
  getThemeByName,
} from "../constants/themes";

const THEME_STORAGE_KEY = "fbla_atlas_theme_v3";

type ThemeContextValue = {
  themeName: AppThemeName;
  palette: ThemePalette;
  paperTheme: MD3Theme;
  navigationTheme: ReturnType<typeof createNavigationTheme>;
  ready: boolean;
  availableThemes: ThemePalette[];
  setThemeName: (name: AppThemeName) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeNameState] = useState<AppThemeName>(DEFAULT_THEME);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!active || !stored) {
          return;
        }
        const exists = APP_THEMES.some((theme) => theme.name === stored);
        if (exists) {
          setThemeNameState(stored as AppThemeName);
        }
      } catch (error) {
        console.warn("Theme bootstrap failed:", error);
      } finally {
        if (active) {
          setReady(true);
        }
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const palette = useMemo(() => getThemeByName(themeName), [themeName]);

  useEffect(() => {
    void NavigationBar.setBackgroundColorAsync(palette.colors.background).catch(() => undefined);
    void NavigationBar.setButtonStyleAsync(palette.isDark ? "light" : "dark").catch(() => undefined);
  }, [palette.colors.background, palette.isDark]);

  const setThemeName = async (name: AppThemeName) => {
    if (name === themeName) {
      return;
    }
    setThemeNameState(name);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
    } catch (error) {
      console.warn("Persist theme failed:", error);
    }
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName,
      palette,
      paperTheme: createPaperTheme(palette),
      navigationTheme: createNavigationTheme(palette),
      ready,
      availableThemes: APP_THEMES,
      setThemeName,
    }),
    [palette, ready, themeName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used inside ThemeProvider");
  }
  return context;
}

export function useTheme(): ThemeContextValue {
  return useThemeContext();
}

