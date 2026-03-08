import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavLightTheme,
  Theme as NavTheme,
} from "@react-navigation/native";
import { MD3DarkTheme, MD3LightTheme, MD3Theme } from "react-native-paper";

export type AppThemeName =
  | "midnight"
  | "charcoal"
  | "navy"
  | "slate"
  | "light"
  | "cream"
  | "sage"
  | "dusk"
  | "mocha";

export type ThemeGroup = "dark" | "light";

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
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    pill: 999,
  },
  blur: {
    sm: 0,
    md: 0,
    lg: 0,
  },
  typography: {
    display: { fontSize: 34, lineHeight: 48, fontWeight: "700" as const },
    heading: { fontSize: 24, lineHeight: 34, fontWeight: "700" as const },
    subheading: { fontSize: 18, lineHeight: 27, fontWeight: "600" as const },
    body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const },
    caption: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
    label: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "600" as const,
      letterSpacing: 0.5,
      textTransform: "uppercase" as const,
    },
  },
  motion: {
    tap: { stiffness: 0, damping: 0, toValue: 1 },
    longPress: { stiffness: 0, damping: 0, toValue: 1 },
    screenEnter: { duration: 0, translateY: 0 },
    tabSwitch: { duration: 0 },
    listStaggerDelay: 0,
    toastDuration: 2500,
  },
};

export const ELEVATION_LEVELS = {
  level0: { shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  level1: { shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  level2: { shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  level3: { shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  level4: { shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
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

type CoreThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentMuted: string;
  success: string;
  error: string;
  warning: string;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const normalized =
    clean.length === 3
      ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
      : clean;
  const num = Number.parseInt(normalized, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

function contrastTextFor(bg: string): string {
  const { r, g, b } = hexToRgb(bg);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}

function makeShadow(level: keyof typeof ELEVATION_LEVELS): ShadowLevel {
  const token = ELEVATION_LEVELS[level];
  return {
    shadowColor: "#000000",
    shadowOpacity: token.shadowOpacity,
    shadowRadius: token.shadowRadius,
    shadowOffset: { width: 0, height: 0 },
    elevation: token.elevation,
  };
}

export type ThemePalette = {
  name: AppThemeName;
  label: string;
  group: ThemeGroup;
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    textFaint: string;
    accent: string;
    accentMuted: string;
    success: string;
    error: string;
    warning: string;
    surfaceSoft: string;
    elevated: string;
    textSecondary: string;
    muted: string;
    primary: string;
    secondary: string;
    onPrimary: string;
    transparent: string;
    cardTint: string;
    glass: string;
    glassStrong: string;
    glassBorder: string;
    glassHighlight: string;
    glassInnerShadow: string;
    glassInset: string;
    glassPressed: string;
    glassDisabled: string;
    accentGlass: string;
    dangerGlass: string;
    successGlass: string;
    tabGlass: string;
    tabBorder: string;
    danger: string;
    onDanger: string;
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
    imageOverlay: string;
    imageOverlayStrong: string;
    onImageText: string;
    onImageMuted: string;
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

function makeTheme(
  name: AppThemeName,
  label: string,
  group: ThemeGroup,
  core: CoreThemeColors,
): ThemePalette {
  const isDark = group === "dark";
  const onAccent = contrastTextFor(core.accent);
  return {
    name,
    label,
    group,
    isDark,
    colors: {
      ...core,
      surfaceSoft: core.surfaceAlt,
      elevated: core.surfaceAlt,
      textSecondary: core.textMuted,
      muted: core.textFaint,
      primary: core.accent,
      secondary: core.accent,
      onPrimary: onAccent,
      transparent: "transparent",
      cardTint: core.surface,
      glass: core.surface,
      glassStrong: core.surface,
      glassBorder: core.border,
      glassHighlight: core.surfaceAlt,
      glassInnerShadow: withAlpha(core.text, isDark ? 0.08 : 0.04),
      glassInset: withAlpha(core.background, isDark ? 0.5 : 0.2),
      glassPressed: core.surfaceAlt,
      glassDisabled: core.surfaceAlt,
      accentGlass: withAlpha(core.accent, isDark ? 0.24 : 0.16),
      dangerGlass: withAlpha(core.error, isDark ? 0.2 : 0.14),
      successGlass: withAlpha(core.success, isDark ? 0.2 : 0.14),
      tabGlass: core.surface,
      tabBorder: core.border,
      danger: core.error,
      onDanger: "#ffffff",
      info: core.accent,
      online: core.success,
      divider: core.border,
      overlay: isDark ? "rgba(0,0,0,0.62)" : "rgba(0,0,0,0.32)",
      accentGlow: core.accentMuted,
      primarySoft: core.accentMuted,
      secondarySoft: core.accentMuted,
      chipSurface: core.surfaceAlt,
      inputSurface: core.surfaceAlt,
      inputMuted: core.border,
      placeholder: core.textFaint,
      subtleDot: core.textMuted,
      readRow: core.surface,
      unreadRow: core.surfaceAlt,
      leftAccent: core.accent,
      imageOverlay: isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.2)",
      imageOverlayStrong: isDark ? "rgba(0,0,0,0.52)" : "rgba(0,0,0,0.32)",
      onImageText: "#ffffff",
      onImageMuted: isDark ? "#e5e5e5" : "#f3f3f3",
    },
    radius: DESIGN_TOKENS.radius,
    blur: DESIGN_TOKENS.blur,
    spacing: DESIGN_TOKENS.spacing,
    typography: DESIGN_TOKENS.typography,
    motion: DESIGN_TOKENS.motion,
    elevation: {
      level0: makeShadow("level0"),
      level1: makeShadow("level1"),
      level2: makeShadow("level2"),
      level3: makeShadow("level3"),
      level4: makeShadow("level4"),
    },
  };
}

const THEMES: Record<AppThemeName, ThemePalette> = {
  midnight: makeTheme("midnight", "Midnight", "dark", {
    background: "#0a0a0a",
    surface: "#1a1a1a",
    surfaceAlt: "#222222",
    border: "#2a2a2a",
    text: "#ffffff",
    textMuted: "#888888",
    textFaint: "#444444",
    accent: "#4f7ef7",
    accentMuted: "#1e3a6e",
    success: "#3d9e6e",
    error: "#c0392b",
    warning: "#d4871a",
  }),
  charcoal: makeTheme("charcoal", "Charcoal", "dark", {
    background: "#111010",
    surface: "#1c1b1b",
    surfaceAlt: "#242323",
    border: "#2e2c2c",
    text: "#f0ece8",
    textMuted: "#8a8480",
    textFaint: "#484442",
    accent: "#c8a882",
    accentMuted: "#3d3228",
    success: "#5a8f6a",
    error: "#a84040",
    warning: "#b8892a",
  }),
  navy: makeTheme("navy", "Navy", "dark", {
    background: "#090d14",
    surface: "#111827",
    surfaceAlt: "#1a2540",
    border: "#1e2d4a",
    text: "#e8edf5",
    textMuted: "#6b7a99",
    textFaint: "#2e3d5c",
    accent: "#5b8dee",
    accentMuted: "#1a2e5c",
    success: "#3a8c6e",
    error: "#a83838",
    warning: "#c49030",
  }),
  slate: makeTheme("slate", "Slate", "dark", {
    background: "#0d0f12",
    surface: "#181b20",
    surfaceAlt: "#1f232a",
    border: "#272c35",
    text: "#dde2ec",
    textMuted: "#707888",
    textFaint: "#404650",
    accent: "#7b93c8",
    accentMuted: "#253050",
    success: "#4a8a68",
    error: "#994040",
    warning: "#b08030",
  }),
  light: makeTheme("light", "Light", "light", {
    background: "#f5f5f5",
    surface: "#ffffff",
    surfaceAlt: "#efefef",
    border: "#e0e0e0",
    text: "#1a1a1a",
    textMuted: "#666666",
    textFaint: "#aaaaaa",
    accent: "#4f7ef7",
    accentMuted: "#dce6fd",
    success: "#3a8c5a",
    error: "#c0392b",
    warning: "#d4871a",
  }),
  cream: makeTheme("cream", "Cream", "light", {
    background: "#f2ede6",
    surface: "#faf7f2",
    surfaceAlt: "#ece6dc",
    border: "#ddd5c8",
    text: "#2c2420",
    textMuted: "#7a6e66",
    textFaint: "#b0a89e",
    accent: "#8b6f47",
    accentMuted: "#e8dece",
    success: "#4a7a54",
    error: "#b04040",
    warning: "#b87820",
  }),
  sage: makeTheme("sage", "Sage", "light", {
    background: "#eef2ee",
    surface: "#f8faf8",
    surfaceAlt: "#e4ebe4",
    border: "#ccd8cc",
    text: "#242e24",
    textMuted: "#607060",
    textFaint: "#98a898",
    accent: "#4a7c59",
    accentMuted: "#ccddd0",
    success: "#3d7a4e",
    error: "#9e3c3c",
    warning: "#a87820",
  }),
  dusk: makeTheme("dusk", "Dusk", "dark", {
    background: "#0e0c14",
    surface: "#181520",
    surfaceAlt: "#201c2c",
    border: "#2a2638",
    text: "#e8e4f0",
    textMuted: "#7870a0",
    textFaint: "#3a3450",
    accent: "#9b82d4",
    accentMuted: "#2e2450",
    success: "#4a8a6a",
    error: "#a04040",
    warning: "#b08030",
  }),
  mocha: makeTheme("mocha", "Mocha", "dark", {
    background: "#0f0b08",
    surface: "#1c1510",
    surfaceAlt: "#241c16",
    border: "#302418",
    text: "#f0e8de",
    textMuted: "#907868",
    textFaint: "#483828",
    accent: "#c8844a",
    accentMuted: "#3c2010",
    success: "#5a8a4a",
    error: "#a84040",
    warning: "#c09030",
  }),
};

export const APP_THEMES: ThemePalette[] = [
  THEMES.midnight,
  THEMES.charcoal,
  THEMES.navy,
  THEMES.slate,
  THEMES.dusk,
  THEMES.mocha,
  THEMES.light,
  THEMES.cream,
  THEMES.sage,
];

export const DEFAULT_THEME: AppThemeName = "midnight";

export function getThemeByName(name: AppThemeName): ThemePalette {
  return THEMES[name] ?? THEMES[DEFAULT_THEME];
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
      tertiary: palette.colors.info,
      background: palette.colors.background,
      surface: palette.colors.surface,
      surfaceDisabled: palette.colors.glassDisabled,
      surfaceVariant: palette.colors.surfaceSoft,
      onBackground: palette.colors.text,
      onSurface: palette.colors.text,
      onSurfaceVariant: palette.colors.textSecondary,
      onPrimary: palette.colors.onPrimary,
      primaryContainer: palette.colors.primarySoft,
      secondaryContainer: palette.colors.secondarySoft,
      outline: palette.colors.border,
      outlineVariant: palette.colors.glassBorder,
      error: palette.colors.danger,
      errorContainer: palette.colors.dangerGlass,
      inverseSurface: palette.colors.surface,
      inverseOnSurface: palette.colors.text,
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

