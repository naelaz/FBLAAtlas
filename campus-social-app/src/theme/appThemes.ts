import { DarkTheme as NavDarkTheme, DefaultTheme as NavLightTheme, Theme as NavTheme } from "@react-navigation/native";
import { MD3DarkTheme, MD3LightTheme, MD3Theme } from "react-native-paper";

export type AppThemeName =
  | "midnight"
  | "sunrise"
  | "forest"
  | "ocean"
  | "candy"
  | "mono";

export type ThemePalette = {
  name: AppThemeName;
  label: string;
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceSoft: string;
    text: string;
    muted: string;
    primary: string;
    secondary: string;
    border: string;
    cardTint: string;
    glass: string;
    glassBorder: string;
    tabGlass: string;
    tabBorder: string;
    danger: string;
    success: string;
  };
};

export const APP_THEMES: ThemePalette[] = [
  {
    name: "midnight",
    label: "Midnight",
    isDark: true,
    colors: {
      background: "#090A1A",
      surface: "#12152B",
      surfaceSoft: "#1A1F3A",
      text: "#EEF2FF",
      muted: "#9CA3D3",
      primary: "#7C5CFF",
      secondary: "#40B5FF",
      border: "#2A2F54",
      cardTint: "rgba(124, 92, 255, 0.18)",
      glass: "rgba(20, 24, 47, 0.55)",
      glassBorder: "rgba(163, 177, 255, 0.35)",
      tabGlass: "rgba(15, 19, 38, 0.78)",
      tabBorder: "rgba(155, 168, 255, 0.45)",
      danger: "#F87171",
      success: "#34D399",
    },
  },
  {
    name: "sunrise",
    label: "Sunrise",
    isDark: false,
    colors: {
      background: "#FFF7ED",
      surface: "#FFFFFF",
      surfaceSoft: "#FFEBD1",
      text: "#7C2D12",
      muted: "#B45309",
      primary: "#F97316",
      secondary: "#FACC15",
      border: "#FED7AA",
      cardTint: "rgba(251, 146, 60, 0.16)",
      glass: "rgba(255, 255, 255, 0.62)",
      glassBorder: "rgba(251, 146, 60, 0.28)",
      tabGlass: "rgba(255, 251, 235, 0.88)",
      tabBorder: "rgba(251, 146, 60, 0.35)",
      danger: "#DC2626",
      success: "#16A34A",
    },
  },
  {
    name: "forest",
    label: "Forest",
    isDark: true,
    colors: {
      background: "#07130E",
      surface: "#0F2018",
      surfaceSoft: "#153126",
      text: "#E7F5EC",
      muted: "#95BFA6",
      primary: "#22C55E",
      secondary: "#4ADE80",
      border: "#2F4E3F",
      cardTint: "rgba(34, 197, 94, 0.16)",
      glass: "rgba(13, 28, 21, 0.62)",
      glassBorder: "rgba(96, 165, 121, 0.35)",
      tabGlass: "rgba(12, 24, 18, 0.8)",
      tabBorder: "rgba(86, 156, 111, 0.4)",
      danger: "#F87171",
      success: "#22C55E",
    },
  },
  {
    name: "ocean",
    label: "Ocean",
    isDark: false,
    colors: {
      background: "#F0FDFF",
      surface: "#FFFFFF",
      surfaceSoft: "#E0F7FA",
      text: "#0C4A6E",
      muted: "#0F766E",
      primary: "#0891B2",
      secondary: "#2563EB",
      border: "#A5F3FC",
      cardTint: "rgba(14, 165, 233, 0.16)",
      glass: "rgba(255, 255, 255, 0.66)",
      glassBorder: "rgba(14, 165, 233, 0.25)",
      tabGlass: "rgba(240, 253, 255, 0.88)",
      tabBorder: "rgba(8, 145, 178, 0.34)",
      danger: "#DC2626",
      success: "#0EA5A4",
    },
  },
  {
    name: "candy",
    label: "Candy",
    isDark: false,
    colors: {
      background: "#FFF1F9",
      surface: "#FFFFFF",
      surfaceSoft: "#FFE4F3",
      text: "#831843",
      muted: "#BE185D",
      primary: "#EC4899",
      secondary: "#A855F7",
      border: "#F9A8D4",
      cardTint: "rgba(236, 72, 153, 0.14)",
      glass: "rgba(255, 255, 255, 0.7)",
      glassBorder: "rgba(236, 72, 153, 0.25)",
      tabGlass: "rgba(255, 244, 250, 0.88)",
      tabBorder: "rgba(168, 85, 247, 0.3)",
      danger: "#E11D48",
      success: "#059669",
    },
  },
  {
    name: "mono",
    label: "Monochrome",
    isDark: true,
    colors: {
      background: "#000000",
      surface: "#111111",
      surfaceSoft: "#1B1B1B",
      text: "#F5F5F5",
      muted: "#A3A3A3",
      primary: "#FFFFFF",
      secondary: "#D4D4D4",
      border: "#404040",
      cardTint: "rgba(255, 255, 255, 0.08)",
      glass: "rgba(16, 16, 16, 0.74)",
      glassBorder: "rgba(255, 255, 255, 0.24)",
      tabGlass: "rgba(10, 10, 10, 0.82)",
      tabBorder: "rgba(255, 255, 255, 0.28)",
      danger: "#F87171",
      success: "#86EFAC",
    },
  },
];

export const DEFAULT_THEME: AppThemeName = "ocean";

export function getThemeByName(name: AppThemeName): ThemePalette {
  return APP_THEMES.find((theme) => theme.name === name) ?? APP_THEMES[0];
}

export function createPaperTheme(palette: ThemePalette): MD3Theme {
  const base = palette.isDark ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    roundness: 16,
    colors: {
      ...base.colors,
      primary: palette.colors.primary,
      secondary: palette.colors.secondary,
      background: palette.colors.background,
      surface: palette.colors.surface,
      surfaceVariant: palette.colors.surfaceSoft,
      onBackground: palette.colors.text,
      onSurface: palette.colors.text,
      onSurfaceVariant: palette.colors.muted,
      outline: palette.colors.border,
      error: palette.colors.danger,
    },
  };
}

export function createNavigationTheme(palette: ThemePalette): NavTheme {
  const base = palette.isDark ? NavDarkTheme : NavLightTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: palette.colors.background,
      card: palette.colors.surface,
      text: palette.colors.text,
      border: palette.colors.border,
      primary: palette.colors.primary,
      notification: palette.colors.danger,
    },
  };
}

