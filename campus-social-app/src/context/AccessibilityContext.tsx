import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { TextStyle } from "react-native";

type AccessibilityState = {
  fontScale: number;
  highContrastMode: boolean;
  reduceAnimations: boolean;
  boldText: boolean;
  screenReaderHints: boolean;
};

type AccessibilityContextValue = AccessibilityState & {
  ready: boolean;
  setFontScale: (value: number) => void;
  setHighContrastMode: (value: boolean) => void;
  setReduceAnimations: (value: boolean) => void;
  setBoldText: (value: boolean) => void;
  setScreenReaderHints: (value: boolean) => void;
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
    setState((prev) => ({ ...prev, fontScale: clampFontScale(value) }));
  }, []);

  const setHighContrastMode = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, highContrastMode: value }));
  }, []);

  const setReduceAnimations = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, reduceAnimations: value }));
  }, []);

  const setBoldText = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, boldText: value }));
  }, []);

  const setScreenReaderHints = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, screenReaderHints: value }));
  }, []);

  const scaleFont = useCallback(
    (size: number) => Number((size * state.fontScale).toFixed(2)),
    [state.fontScale],
  );

  const getFontWeight = useCallback(
    (normal: TextStyle["fontWeight"]) => (state.boldText ? "700" : normal),
    [state.boldText],
  );

  const getAccessibilityHint = useCallback(
    (hint?: string) => (state.screenReaderHints ? hint : undefined),
    [state.screenReaderHints],
  );

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...state,
      ready,
      setFontScale,
      setHighContrastMode,
      setReduceAnimations,
      setBoldText,
      setScreenReaderHints,
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
      setFontScale,
      setHighContrastMode,
      setReduceAnimations,
      setScreenReaderHints,
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
