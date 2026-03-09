import { useMemo } from "react";

import { useAccessibility } from "../context/AccessibilityContext";

export function useAnimationDuration(normalDuration: number): number {
  const { reduceAnimations } = useAccessibility();
  return useMemo(() => (reduceAnimations ? 0 : normalDuration), [normalDuration, reduceAnimations]);
}

export function useAnimationDelay(normalDelay: number): number {
  const { reduceAnimations } = useAccessibility();
  return useMemo(() => (reduceAnimations ? 0 : normalDelay), [normalDelay, reduceAnimations]);
}

