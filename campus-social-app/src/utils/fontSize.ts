import { useAccessibility } from "../context/AccessibilityContext";

export function useScaledFont(base: number): number {
  const { fontScale } = useAccessibility();
  return Number((base * fontScale).toFixed(2));
}
