import { useEffect } from "react";

import { useAccessibility } from "../context/AccessibilityContext";
import {
  hapticImportant,
  hapticLike,
  hapticSuccess,
  hapticTap,
  hapticWarning,
  setHapticIntensity,
} from "../services/haptics";

export function useHaptics() {
  const { hapticIntensity } = useAccessibility();

  useEffect(() => {
    setHapticIntensity(hapticIntensity);
  }, [hapticIntensity]);

  return {
    tap: hapticTap,
    like: hapticLike,
    success: hapticSuccess,
    warning: hapticWarning,
    important: hapticImportant,
  };
}
