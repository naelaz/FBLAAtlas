import 'package:fbla_atlas/core/services/cache_service.dart';
import 'package:fbla_atlas/data/seed/seed_data.dart';
import 'package:fbla_atlas/domain/models/event_item.dart';
import 'package:fbla_atlas/domain/models/reminder.dart';
import 'package:fbla_atlas/domain/repositories/events_repository.dart';

class DemoEventsRepository implements EventsRepository {
  DemoEventsRepository({required CacheService cacheService}) : _cacheService = cacheService;

  final CacheService _cacheService;
  static const String _remindersKey = 'events.reminders';

  @override
  Future<List<EventItem>> fetchEvents() async {
    return SeedData.events();
  }

  @override
  Future<List<Reminder>> fetchReminders() async {
    final payload = await _cacheService.readMapList(_remindersKey);
    return payload.map(Reminder.fromJson).toList();
  }

  @override
  Future<void> upsertReminder(Reminder reminder) async {
    final reminders = await fetchReminders();
    final index = reminders.indexWhere((item) => item.eventId == reminder.eventId);
    if (index >= 0) {
      reminders[index] = reminder;
    } else {
      reminders.add(reminder);
    }
    await _cacheService.writeMapList(
      _remindersKey,
      reminders.map((item) => item.toJson()).toList(),
    );
  }

  @override
  Future<void> removeReminderForEvent(String eventId) async {
    final reminders = await fetchReminders();
    reminders.removeWhere((item) => item.eventId == eventId);
    await _cacheService.writeMapList(
      _remindersKey,
      reminders.map((item) => item.toJson()).toList(),
    );
  }
}
