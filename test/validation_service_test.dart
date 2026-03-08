import 'package:flutter_test/flutter_test.dart';
import 'package:fbla_atlas/core/services/validation_service.dart';

void main() {
  group('ValidationService', () {
    final service = ValidationService();

    test('accepts a valid email and rejects malformed email', () {
      expect(service.isValidEmail('member@fbla.org'), isTrue);
      expect(service.isValidEmail('member@fbla'), isFalse);
    });

    test('enforces password complexity', () {
      expect(service.isValidPassword('Fbla2026!'), isTrue);
      expect(service.isValidPassword('simple'), isFalse);
    });

    test('validates event date ranges', () {
      final start = DateTime(2026, 1, 1, 10);
      final end = DateTime(2026, 1, 1, 11);
      final invalidEnd = DateTime(2026, 1, 1, 9);
      expect(service.isValidEventRange(start, end), isTrue);
      expect(service.isValidEventRange(start, invalidEnd), isFalse);
    });
  });
}
