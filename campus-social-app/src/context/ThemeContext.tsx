import AsyncStorage from "@react-native-async-storage/async-storage";
import * as NavigationBar from "expo-navigation-bar";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MD3Theme } from "react-native-paper";

import { useAccessibility } from "./AccessibilityContext";
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
  const { fontScale, boldText, highContrastMode } = useAccessibility();
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

  const basePalette = useMemo(() => getThemeByName(themeName), [themeName]);
  const palette = useMemo(() => {
    if (!highContrastMode) {
      return basePalette;
    }
    return {
      ...basePalette,
      colors: {
        ...basePalette.colors,
        textMuted: basePalette.colors.text,
        textSecondary: basePalette.colors.text,
        muted: basePalette.colors.text,
        placeholder: basePalette.colors.text,
        border: basePalette.colors.textMuted,
        divider: basePalette.colors.textMuted,
      },
    };
  }, [basePalette, highContrastMode]);

  useEffect(() => {
    void NavigationBar.setButtonStyleAsync(palette.isDark ? "light" : "dark").catch(() => undefined);
  }, [palette.isDark]);

  const setThemeName = useCallback(async (name: AppThemeName) => {
    let shouldPersist = false;
    setThemeNameState((previous) => {
      if (previous === name) {
        return previous;
      }
      shouldPersist = true;
      return name;
    });

    if (!shouldPersist) {
      return;
    }

    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
    } catch (error) {
      console.warn("Persist theme failed:", error);
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName,
      palette,
      paperTheme: createPaperTheme(palette, { fontScale, boldText }),
      navigationTheme: createNavigationTheme(palette),
      ready,
      availableThemes: APP_THEMES,
      setThemeName,
    }),
    [boldText, fontScale, palette, ready, setThemeName, themeName],
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
