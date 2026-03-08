import * as Haptics from "expo-haptics";

export function hapticTap(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function hapticLike(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function hapticSuccess(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

