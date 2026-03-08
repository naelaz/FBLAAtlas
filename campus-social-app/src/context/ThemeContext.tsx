import AsyncStorage from "@react-native-async-storage/async-storage";
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

type ThemeContextValue = {
  themeName: AppThemeName;
  palette: ThemePalette;
  paperTheme: MD3Theme;
  navigationTheme: ReturnType<typeof createNavigationTheme>;
  ready: boolean;
  setThemeName: (name: AppThemeName) => Promise<void>;
};

const STORAGE_KEY = "fbla_atlas_theme_name_v1";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeNameState] = useState<AppThemeName>(DEFAULT_THEME);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) {
          return;
        }
        if (saved) {
          const matched = APP_THEMES.find((theme) => theme.name === saved);
          if (matched) {
            setThemeNameState(matched.name);
          }
        }
      } catch (error) {
        console.warn("Theme load failed:", error);
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    };

    void loadTheme();
    return () => {
      mounted = false;
    };
  }, []);

  const setThemeName = async (name: AppThemeName) => {
    setThemeNameState(name);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, name);
    } catch (error) {
      console.warn("Theme save failed:", error);
    }
  };

  const value = useMemo(() => {
    const palette = getThemeByName(themeName);
    return {
      themeName,
      palette,
      paperTheme: createPaperTheme(palette),
      navigationTheme: createNavigationTheme(palette),
      ready,
      setThemeName,
    };
  }, [themeName, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used inside ThemeProvider");
  }
  return context;
}


