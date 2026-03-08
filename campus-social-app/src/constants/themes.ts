import { DarkTheme as NavDarkTheme, DefaultTheme as NavLightTheme, Theme as NavTheme } from "@react-navigation/native";
import { MD3DarkTheme, MD3LightTheme, MD3Theme } from "react-native-paper";

export type AppThemeName = "midnight" | "sunrise" | "forest" | "ocean" | "candy" | "mono";

export type ShadowLevel = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
};

export const DESIGN_TOKENS = {
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    pill: 999,
  },
  blur: {
    sm: 20,
    md: 32,
    lg: 48,
  },
  typography: {
    display: { fontSize: 34, lineHeight: 51, fontWeight: "700" as const },
    heading: { fontSize: 24, lineHeight: 36, fontWeight: "600" as const },
    subheading: { fontSize: 18, lineHeight: 27, fontWeight: "500" as const },
    body: { fontSize: 15, lineHeight: 22.5, fontWeight: "400" as const },
    caption: { fontSize: 13, lineHeight: 19.5, fontWeight: "400" as const },
    label: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "500" as const,
      letterSpacing: 1,
      textTransform: "uppercase" as const,
    },
  },
  motion: {
    tap: { stiffness: 300, damping: 20, toValue: 0.96 },
    longPress: { stiffness: 280, damping: 22, toValue: 0.93 },
    screenEnter: { duration: 280, translateY: 12 },
    tabSwitch: { duration: 200 },
    listStaggerDelay: 40,
    toastDuration: 2500,
  },
};

export const ELEVATION_LEVELS = {
  level0: { shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  level1: { shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  level2: { shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  level3: { shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 },
  level4: { shadowOpacity: 0.32, shadowRadius: 40, elevation: 16 },
} as const;

export const TIER_COLORS = {
  Bronze: "#B45309",
  Silver: "#9CA3AF",
  Gold: "#EAB308",
  Platinum: "#14B8A6",
  Diamond: "#3B82F6",
  Legend: "#9333EA",
} as const;

export const BRAND_COLORS = {
  instagram: "#E1306C",
  x: "#1D9BF0",
  tiktok: "#111827",
  youtube: "#EF4444",
  snapchat: "#FACC15",
} as const;

export const AVATAR_FALLBACK_COLORS = [
  "#7C3AED",
  "#06B6D4",
  "#10B981",
  "#84CC16",
  "#0EA5E9",
  "#6366F1",
  "#EC4899",
  "#A855F7",
] as const;

function alpha(hex: string, opacity: number): string {
  const clean = hex.replace("#", "");
  const normalized = clean.length === 3 ? clean.split("").map((c) => `${c}${c}`).join("") : clean;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function makeShadow(color: string, level: keyof typeof ELEVATION_LEVELS): ShadowLevel {
  const token = ELEVATION_LEVELS[level];
  return {
    shadowColor: color,
    shadowOpacity: token.shadowOpacity,
    shadowRadius: token.shadowRadius,
    shadowOffset: { width: 0, height: Math.max(1, Math.floor(token.shadowRadius / 2)) },
    elevation: token.elevation,
  };
}

type RawTheme = {
  name: AppThemeName;
  label: string;
  isDark: boolean;
  base: string;
  surface: string;
  elevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentSecondary: string;
};

function isLightHexColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  const normalized = clean.length === 3 ? clean.split("").map((c) => `${c}${c}`).join("") : clean;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  // W3C relative luminance approximation threshold
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

const RAW_THEMES: RawTheme[] = [
  {
    name: "midnight",
    label: "Midnight",
    isDark: true,
    base: "#0A0A0F",
    surface: "#111118",
    elevated: "#1C1C27",
    textPrimary: "#F0F0FF",
    textSecondary: "#8888AA",
    textMuted: "#44445A",
    accentPrimary: "#7C3AED",
    accentSecondary: "#06B6D4",
  },
  {
    name: "sunrise",
    label: "Sunrise",
    isDark: false,
    base: "#FFF5EC",
    surface: "#FFF1E6",
    elevated: "#FFE5CF",
    textPrimary: "#3A1E12",
    textSecondary: "#7A4A30",
    textMuted: "#9F7A68",
    accentPrimary: "#F59E0B",
    accentSecondary: "#F43F5E",
  },
  {
    name: "forest",
    label: "Forest",
    isDark: true,
    base: "#08120E",
    surface: "#102019",
    elevated: "#1A2E25",
    textPrimary: "#E9FFF4",
    textSecondary: "#94BFA7",
    textMuted: "#4A6A58",
    accentPrimary: "#10B981",
    accentSecondary: "#84CC16",
  },
  {
    name: "ocean",
    label: "Ocean",
    isDark: false,
    base: "#ECF8FF",
    surface: "#E6F4FF",
    elevated: "#D6EAFE",
    textPrimary: "#0B2A43",
    textSecondary: "#335A79",
    textMuted: "#5E7E98",
    accentPrimary: "#0EA5E9",
    accentSecondary: "#6366F1",
  },
  {
    name: "candy",
    label: "Candy",
    isDark: false,
    base: "#FFF0F7",
    surface: "#FFE8F3",
    elevated: "#FFDDED",
    textPrimary: "#3C1231",
    textSecondary: "#7C3E68",
    textMuted: "#9A6690",
    accentPrimary: "#EC4899",
    accentSecondary: "#A855F7",
  },
  {
    name: "mono",
    label: "Monochrome",
    isDark: true,
    base: "#0D0D0D",
    surface: "#171717",
    elevated: "#222222",
    textPrimary: "#F5F5F7",
    textSecondary: "#A3A3A3",
    textMuted: "#6B7280",
    accentPrimary: "#FFFFFF",
    accentSecondary: "#6B7280",
  },
];

export type ThemePalette = {
  name: AppThemeName;
  label: string;
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceSoft: string;
    elevated: string;
    text: string;
    textSecondary: string;
    muted: string;
    primary: string;
    secondary: string;
    onPrimary: string;
    border: string;
    cardTint: string;
    glass: string;
    glassStrong: string;
    glassBorder: string;
    tabGlass: string;
    tabBorder: string;
    danger: string;
    onDanger: string;
    success: string;
    warning: string;
    info: string;
    online: string;
    divider: string;
    overlay: string;
    accentGlow: string;
    primarySoft: string;
    secondarySoft: string;
    chipSurface: string;
    inputSurface: string;
    inputMuted: string;
    placeholder: string;
    subtleDot: string;
    readRow: string;
    unreadRow: string;
    leftAccent: string;
  };
  radius: typeof DESIGN_TOKENS.radius;
  blur: typeof DESIGN_TOKENS.blur;
  spacing: typeof DESIGN_TOKENS.spacing;
  typography: typeof DESIGN_TOKENS.typography;
  motion: typeof DESIGN_TOKENS.motion;
  elevation: {
    level0: ShadowLevel;
    level1: ShadowLevel;
    level2: ShadowLevel;
    level3: ShadowLevel;
    level4: ShadowLevel;
  };
};

export const APP_THEMES: ThemePalette[] = RAW_THEMES.map((theme) => {
  const lightBorder = alpha("#000000", 0.08);
  const darkBorder = alpha("#FFFFFF", 0.18);
  const border = theme.isDark ? darkBorder : lightBorder;

  return {
    name: theme.name,
    label: theme.label,
    isDark: theme.isDark,
    colors: {
      background: theme.base,
      surface: theme.surface,
      surfaceSoft: alpha(theme.elevated, 0.92),
      elevated: theme.elevated,
      text: theme.textPrimary,
      textSecondary: theme.textSecondary,
      muted: theme.textMuted,
      primary: theme.accentPrimary,
      secondary: theme.accentSecondary,
      onPrimary: isLightHexColor(theme.accentPrimary) ? "#0A0A0F" : "#F8FAFC",
      border,
      cardTint: alpha(theme.accentPrimary, theme.isDark ? 0.2 : 0.14),
      glass: theme.isDark ? alpha(theme.surface, 0.72) : alpha(theme.surface, 0.75),
      glassStrong: theme.isDark ? alpha(theme.elevated, 0.88) : alpha(theme.surface, 0.92),
      glassBorder: border,
      tabGlass: theme.isDark ? alpha(theme.elevated, 0.85) : alpha(theme.surface, 0.85),
      tabBorder: border,
      danger: "#EF4444",
      onDanger: "#F8FAFC",
      success: "#10B981",
      warning: "#F59E0B",
      info: theme.accentSecondary,
      online: "#22C55E",
      divider: theme.isDark ? alpha(theme.textPrimary, 0.12) : alpha(theme.textPrimary, 0.08),
      overlay: alpha(theme.isDark ? "#0A0A0F" : "#111118", 0.58),
      accentGlow: alpha(theme.accentPrimary, 0.4),
      primarySoft: alpha(theme.accentPrimary, theme.isDark ? 0.2 : 0.18),
      secondarySoft: alpha(theme.accentSecondary, theme.isDark ? 0.24 : 0.18),
      chipSurface: theme.isDark ? alpha(theme.elevated, 0.78) : alpha(theme.surface, 0.92),
      inputSurface: theme.isDark ? alpha(theme.elevated, 0.72) : alpha(theme.surface, 0.96),
      inputMuted: theme.isDark ? alpha(theme.textSecondary, 0.3) : alpha(theme.textSecondary, 0.22),
      placeholder: alpha(theme.textSecondary, 0.86),
      subtleDot: alpha(theme.textSecondary, 0.9),
      readRow: theme.isDark ? alpha(theme.surface, 0.7) : alpha(theme.surface, 0.68),
      unreadRow: theme.isDark ? alpha(theme.elevated, 0.88) : alpha(theme.elevated, 0.86),
      leftAccent: theme.accentPrimary,
    },
    radius: DESIGN_TOKENS.radius,
    blur: DESIGN_TOKENS.blur,
    spacing: DESIGN_TOKENS.spacing,
    typography: DESIGN_TOKENS.typography,
    motion: DESIGN_TOKENS.motion,
    elevation: {
      level0: makeShadow(theme.base, "level0"),
      level1: makeShadow(theme.textPrimary, "level1"),
      level2: makeShadow(theme.textPrimary, "level2"),
      level3: makeShadow(theme.textPrimary, "level3"),
      level4: makeShadow(theme.textPrimary, "level4"),
    },
  } satisfies ThemePalette;
});

export const DEFAULT_THEME: AppThemeName = "midnight";

export function getThemeByName(name: AppThemeName): ThemePalette {
  return APP_THEMES.find((theme) => theme.name === name) ?? APP_THEMES[0];
}

export function createPaperTheme(palette: ThemePalette): MD3Theme {
  const base = palette.isDark ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    roundness: palette.radius.md,
    colors: {
      ...base.colors,
      primary: palette.colors.primary,
      secondary: palette.colors.secondary,
      background: palette.colors.background,
      surface: palette.colors.surface,
      surfaceVariant: palette.colors.surfaceSoft,
      onBackground: palette.colors.text,
      onSurface: palette.colors.text,
      onSurfaceVariant: palette.colors.textSecondary,
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
