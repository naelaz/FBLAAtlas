import { StyleProp, ViewStyle } from "react-native";

import { ThemePalette } from "../constants/themes";

export type GlassTone = "neutral" | "accent" | "danger" | "success";
export type GlassElevation = 1 | 2 | 3 | 4;

type GlassStyleOptions = {
  tone?: GlassTone;
  elevation?: GlassElevation;
  pressed?: boolean;
  disabled?: boolean;
  strong?: boolean;
  accentColor?: string;
};

function applyAlpha(hex: string, opacity: number): string {
  const clean = hex.replace("#", "");
  const normalized =
    clean.length === 3 ? clean.split("").map((char) => `${char}${char}`).join("") : clean;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function toneBackground(
  palette: ThemePalette,
  tone: GlassTone,
  strong: boolean,
  accentColor?: string,
): string {
  if (tone === "accent") {
    return strong
      ? applyAlpha(accentColor ?? palette.colors.primary, palette.isDark ? 0.35 : 0.24)
      : palette.colors.primarySoft;
  }
  if (tone === "danger") {
    return strong ? palette.colors.dangerGlass : palette.colors.surfaceSoft;
  }
  if (tone === "success") {
    return strong ? palette.colors.successGlass : palette.colors.surfaceSoft;
  }
  return strong ? palette.colors.glassStrong : palette.colors.glass;
}

function elevationStyle(palette: ThemePalette, elevation: GlassElevation): ViewStyle {
  const key = `level${elevation}` as const;
  const shadow = palette.elevation[key];
  return {
    shadowColor: shadow.shadowColor,
    shadowOpacity: shadow.shadowOpacity,
    shadowRadius: shadow.shadowRadius,
    shadowOffset: shadow.shadowOffset,
    elevation: shadow.elevation,
  };
}

export function getGlassContainerStyle(
  palette: ThemePalette,
  options: GlassStyleOptions = {},
): StyleProp<ViewStyle> {
  const {
    tone = "neutral",
    elevation = 2,
    pressed = false,
    disabled = false,
    strong = false,
    accentColor,
  } = options;

  return {
    backgroundColor: disabled
      ? palette.colors.glassDisabled
      : pressed
        ? palette.colors.glassPressed
        : toneBackground(palette, tone, strong, accentColor),
    borderColor: palette.colors.glassBorder,
    borderWidth: 1,
    ...elevationStyle(palette, elevation),
  };
}

export function getGlassTopHighlightStyle(
  palette: ThemePalette,
  borderRadius: number,
): ViewStyle {
  return {
    position: "absolute",
    left: 1,
    right: 1,
    top: 1,
    height: 1,
    backgroundColor: palette.colors.glassHighlight,
    borderRadius,
    opacity: palette.isDark ? 0.92 : 0.85,
  };
}

export function getGlassInsetStyle(
  palette: ThemePalette,
  borderRadius: number,
): ViewStyle {
  return {
    position: "absolute",
    left: 1,
    right: 1,
    bottom: 1,
    height: 2,
    backgroundColor: palette.colors.glassInset,
    borderRadius,
    opacity: palette.isDark ? 0.76 : 0.64,
  };
}

export function getGlassEdgeGlowStyle(
  palette: ThemePalette,
  borderRadius: number,
): ViewStyle {
  return {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius,
    borderWidth: 1,
    borderColor: palette.colors.glassHighlight,
    opacity: palette.isDark ? 0.35 : 0.24,
  };
}

