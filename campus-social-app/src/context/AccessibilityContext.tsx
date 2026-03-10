import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { TextStyle } from "react-native";

import { HapticIntensity, setHapticIntensity } from "../services/haptics";

type AccessibilityState = {
  fontScale: number;
  highContrastMode: boolean;
  reduceAnimations: boolean;
  boldText: boolean;
  screenReaderHints: boolean;
  oneHandedMode: boolean;
  leftHandedMode: boolean;
  hapticIntensity: HapticIntensity;
  colorBlindMode: "none" | "deuteranopia" | "protanopia" | "tritanopia";
  focusMode: boolean;
};

type AccessibilityContextValue = AccessibilityState & {
  ready: boolean;
  setFontScale: (value: number) => void;
  setHighContrastMode: (value: boolean) => void;
  setReduceAnimations: (value: boolean) => void;
  setBoldText: (value: boolean) => void;
  setScreenReaderHints: (value: boolean) => void;
  setOneHandedMode: (value: boolean) => void;
  setLeftHandedMode: (value: boolean) => void;
  setHapticIntensityMode: (value: HapticIntensity) => void;
  setColorBlindMode: (
    value: AccessibilityState["colorBlindMode"],
  ) => void;
  setFocusMode: (value: boolean) => void;
  scaleFont: (size: number) => number;
  getFontWeight: (normal: TextStyle["fontWeight"]) => TextStyle["fontWeight"];
  getAccessibilityHint: (hint?: string) => string | undefined;
};

const STORAGE_KEY = "fbla_atlas_accessibility_v1";

const DEFAULT_ACCESSIBILITY_STATE: AccessibilityState = {
  fontScale: 1,
  highContrastMode: false,
  reduceAnimations: false,
  boldText: false,
  screenReaderHints: true,
  oneHandedMode: false,
  leftHandedMode: false,
  hapticIntensity: "full",
  colorBlindMode: "none",
  focusMode: false,
};

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

function clampFontScale(value: number): number {
  return Math.max(0.8, Math.min(1.4, value));
}

function parseState(raw: string | null): AccessibilityState {
  if (!raw) {
    return DEFAULT_ACCESSIBILITY_STATE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AccessibilityState>;
    return {
      fontScale:
        typeof parsed.fontScale === "number"
          ? clampFontScale(parsed.fontScale)
          : DEFAULT_ACCESSIBILITY_STATE.fontScale,
      highContrastMode:
        typeof parsed.highContrastMode === "boolean"
          ? parsed.highContrastMode
          : DEFAULT_ACCESSIBILITY_STATE.highContrastMode,
      reduceAnimations:
        typeof parsed.reduceAnimations === "boolean"
          ? parsed.reduceAnimations
          : DEFAULT_ACCESSIBILITY_STATE.reduceAnimations,
      boldText:
        typeof parsed.boldText === "boolean"
          ? parsed.boldText
          : DEFAULT_ACCESSIBILITY_STATE.boldText,
      screenReaderHints:
        typeof parsed.screenReaderHints === "boolean"
          ? parsed.screenReaderHints
          : DEFAULT_ACCESSIBILITY_STATE.screenReaderHints,
      oneHandedMode:
        typeof parsed.oneHandedMode === "boolean"
          ? parsed.oneHandedMode
          : DEFAULT_ACCESSIBILITY_STATE.oneHandedMode,
      leftHandedMode:
        typeof parsed.leftHandedMode === "boolean"
          ? parsed.leftHandedMode
          : DEFAULT_ACCESSIBILITY_STATE.leftHandedMode,
      hapticIntensity:
        parsed.hapticIntensity === "off" ||
        parsed.hapticIntensity === "subtle" ||
        parsed.hapticIntensity === "full"
          ? parsed.hapticIntensity
          : DEFAULT_ACCESSIBILITY_STATE.hapticIntensity,
      colorBlindMode:
        parsed.colorBlindMode === "none" ||
        parsed.colorBlindMode === "deuteranopia" ||
        parsed.colorBlindMode === "protanopia" ||
        parsed.colorBlindMode === "tritanopia"
          ? parsed.colorBlindMode
          : DEFAULT_ACCESSIBILITY_STATE.colorBlindMode,
      focusMode:
        typeof parsed.focusMode === "boolean"
          ? parsed.focusMode
          : DEFAULT_ACCESSIBILITY_STATE.focusMode,
    };
  } catch {
    return DEFAULT_ACCESSIBILITY_STATE;
  }
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccessibilityState>(DEFAULT_ACCESSIBILITY_STATE);
  const [ready, setReady] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) {
          return;
        }
        setState(parseState(raw));
      } catch (error) {
        console.warn("Accessibility bootstrap failed:", error);
      } finally {
        if (mounted) {
          hydratedRef.current = true;
          setReady(true);
        }
      }
    };
    void load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((error) => {
      console.warn("Accessibility persistence failed:", error);
    });
  }, [state]);

  const setFontScale = useCallback((value: number) => {
    const next = clampFontScale(value);
    setState((prev) => (prev.fontScale === next ? prev : { ...prev, fontScale: next }));
  }, []);

  const setHighContrastMode = useCallback((value: boolean) => {
    setState((prev) => (prev.highContrastMode === value ? prev : { ...prev, highContrastMode: value }));
  }, []);

  const setReduceAnimations = useCallback((value: boolean) => {
    setState((prev) => (prev.reduceAnimations === value ? prev : { ...prev, reduceAnimations: value }));
  }, []);

  const setBoldText = useCallback((value: boolean) => {
    setState((prev) => (prev.boldText === value ? prev : { ...prev, boldText: value }));
  }, []);

  const setScreenReaderHints = useCallback((value: boolean) => {
    setState((prev) => (prev.screenReaderHints === value ? prev : { ...prev, screenReaderHints: value }));
  }, []);

  const setOneHandedMode = useCallback((value: boolean) => {
    setState((prev) => (prev.oneHandedMode === value ? prev : { ...prev, oneHandedMode: value }));
  }, []);

  const setLeftHandedMode = useCallback((value: boolean) => {
    setState((prev) => (prev.leftHandedMode === value ? prev : { ...prev, leftHandedMode: value }));
  }, []);

  const setHapticIntensityMode = useCallback((value: HapticIntensity) => {
    setState((prev) => (prev.hapticIntensity === value ? prev : { ...prev, hapticIntensity: value }));
  }, []);

  const setColorBlindMode = useCallback((value: AccessibilityState["colorBlindMode"]) => {
    setState((prev) => (prev.colorBlindMode === value ? prev : { ...prev, colorBlindMode: value }));
  }, []);

  const setFocusMode = useCallback((value: boolean) => {
    setState((prev) => (prev.focusMode === value ? prev : { ...prev, focusMode: value }));
  }, []);

  const scaleFont = useCallback(
    (size: number) => Number((size * state.fontScale).toFixed(2)),
    [state.fontScale],
  );

  const getFontWeight = useCallback(
    (normal: TextStyle["fontWeight"]) => {
      if (!state.boldText || !normal) {
        return normal;
      }
      const weight = String(normal).toLowerCase();
      switch (weight) {
        case "normal":
        case "400":
        case "regular":
          return "500";
        case "500":
        case "medium":
          return "600";
        case "600":
        case "semibold":
          return "700";
        case "700":
        case "bold":
          return "800";
        case "800":
        case "heavy":
          return "900";
        default:
          return normal;
      }
    },
    [state.boldText],
  );

  const getAccessibilityHint = useCallback(
    (hint?: string) => (state.screenReaderHints ? hint : undefined),
    [state.screenReaderHints],
  );

  useEffect(() => {
    setHapticIntensity(state.hapticIntensity);
  }, [state.hapticIntensity]);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...state,
      ready,
      setFontScale,
      setHighContrastMode,
      setReduceAnimations,
      setBoldText,
      setScreenReaderHints,
      setOneHandedMode,
      setLeftHandedMode,
      setHapticIntensityMode,
      setColorBlindMode,
      setFocusMode,
      scaleFont,
      getFontWeight,
      getAccessibilityHint,
    }),
    [
      getAccessibilityHint,
      getFontWeight,
      ready,
      scaleFont,
      setBoldText,
      setColorBlindMode,
      setFontScale,
      setFocusMode,
      setHapticIntensityMode,
      setHighContrastMode,
      setOneHandedMode,
      setReduceAnimations,
      setScreenReaderHints,
      setLeftHandedMode,
      state,
    ],
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return context;
}
