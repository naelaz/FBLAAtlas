import 'package:flutter_riverpod/flutter_riverpod.dart';

class AccessibilitySettings {
  const AccessibilitySettings({
    required this.highContrast,
    required this.largeText,
  });

  final bool highContrast;
  final bool largeText;

  AccessibilitySettings copyWith({
    bool? highContrast,
    bool? largeText,
  }) {
    return AccessibilitySettings(
      highContrast: highContrast ?? this.highContrast,
      largeText: largeText ?? this.largeText,
    );
  }
}

class AccessibilityController extends StateNotifier<AccessibilitySettings> {
  AccessibilityController()
      : super(const AccessibilitySettings(highContrast: false, largeText: false));

  void setHighContrast(bool enabled) {
    state = state.copyWith(highContrast: enabled);
  }

  void setLargeText(bool enabled) {
    state = state.copyWith(largeText: enabled);
  }

  void apply({
    required bool highContrast,
    required bool largeText,
  }) {
    state = AccessibilitySettings(
      highContrast: highContrast,
      largeText: largeText,
    );
  }
}

final accessibilityControllerProvider =
    StateNotifierProvider<AccessibilityController, AccessibilitySettings>((ref) {
  return AccessibilityController();
});
