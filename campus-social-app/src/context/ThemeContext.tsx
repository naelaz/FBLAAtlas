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
  const { fontScale, boldText, highContrastMode, colorBlindMode } = useAccessibility();
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

  // Color blind palette overrides — replace red/green with universally distinguishable colors
  // Also update ALL derived colors (dangerGlass, successGlass, online, error, etc.)
  const COLOR_BLIND_OVERRIDES: Record<string, Partial<typeof basePalette.colors>> = {
    deuteranopia: {
      // Red-green blind: swap green→blue, red→orange
      success: "#0077BB",
      error: "#EE7733",
      danger: "#EE7733",
      warning: "#888888",
      dangerGlass: basePalette.isDark ? "rgba(238,119,51,0.20)" : "rgba(238,119,51,0.14)",
      successGlass: basePalette.isDark ? "rgba(0,119,187,0.20)" : "rgba(0,119,187,0.14)",
      online: "#0077BB",
    },
    protanopia: {
      // Red blind: red looks dark → use orange/teal
      success: "#009988",
      error: "#EE7733",
      danger: "#EE7733",
      warning: "#CCAA00",
      dangerGlass: basePalette.isDark ? "rgba(238,119,51,0.20)" : "rgba(238,119,51,0.14)",
      successGlass: basePalette.isDark ? "rgba(0,153,136,0.20)" : "rgba(0,153,136,0.14)",
      online: "#009988",
    },
    tritanopia: {
      // Blue-yellow blind: use red/magenta/teal
      primary: "#CC3311",
      secondary: "#CC3311",
      success: "#009988",
      error: "#CC3311",
      danger: "#CC3311",
      warning: "#EE3377",
      info: "#CC3311",
      leftAccent: "#CC3311",
      primarySoft: "rgba(204,51,17,0.15)",
      secondarySoft: "rgba(204,51,17,0.15)",
      accentGlass: basePalette.isDark ? "rgba(204,51,17,0.24)" : "rgba(204,51,17,0.16)",
      dangerGlass: basePalette.isDark ? "rgba(204,51,17,0.20)" : "rgba(204,51,17,0.14)",
      successGlass: basePalette.isDark ? "rgba(0,153,136,0.20)" : "rgba(0,153,136,0.14)",
      online: "#009988",
    },
  };

  const palette = useMemo(() => {
    let result = basePalette;

    if (colorBlindMode !== "none") {
      const overrides = COLOR_BLIND_OVERRIDES[colorBlindMode] ?? {};
      result = {
        ...result,
        colors: { ...result.colors, ...overrides },
      };
    }

    if (highContrastMode) {
      result = {
        ...result,
        colors: {
          ...result.colors,
          textMuted: result.colors.text,
          textSecondary: result.colors.text,
          muted: result.colors.text,
          placeholder: result.colors.text,
          border: result.colors.textMuted,
          divider: result.colors.textMuted,
        },
      };
    }

    return result;
  }, [basePalette, highContrastMode, colorBlindMode]);

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
