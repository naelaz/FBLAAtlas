import * as Haptics from "expo-haptics";

export type HapticIntensity = "off" | "subtle" | "full";

let currentHapticIntensity: HapticIntensity = "full";

export function setHapticIntensity(level: HapticIntensity): void {
  currentHapticIntensity = level;
}

export function getHapticIntensity(): HapticIntensity {
  return currentHapticIntensity;
}

export function hapticTap(): void {
  if (currentHapticIntensity !== "full") {
    return;
  }
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function hapticLike(): void {
  if (currentHapticIntensity !== "full") {
    return;
  }
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function hapticSuccess(): void {
  if (currentHapticIntensity === "off") {
    return;
  }
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function hapticWarning(): void {
  if (currentHapticIntensity === "off") {
    return;
  }
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

export function hapticImportant(): void {
  if (currentHapticIntensity === "off") {
    return;
  }
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}
