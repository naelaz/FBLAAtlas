import 'package:flutter_test/flutter_test.dart';
import 'package:fbla_atlas/core/services/cache_service.dart';
import 'package:fbla_atlas/data/repositories/demo_events_repository.dart';
import 'package:fbla_atlas/domain/models/reminder.dart';

void main() {
  group('DemoEventsRepository', () {
    late DemoEventsRepository repository;

    setUp(() async {
      final cache = MemoryCacheService();
      await cache.initialize();
      repository = DemoEventsRepository(cacheService: cache);
    });

    test('returns seeded events', () async {
      final events = await repository.fetchEvents();
      expect(events, isNotEmpty);
    });

    test('upserts and removes reminders by event id', () async {
      final reminder = Reminder(
        id: 'r1',
        eventId: 'ev_kickoff',
        scheduledAt: DateTime(2026, 9, 12, 14, 0),
        enabled: true,
      );

      await repository.upsertReminder(reminder);
      final saved = await repository.fetchReminders();
      expect(saved.length, 1);
      expect(saved.first.eventId, 'ev_kickoff');

      await repository.removeReminderForEvent('ev_kickoff');
      final afterDelete = await repository.fetchReminders();
      expect(afterDelete, isEmpty);
    });
  });
}
