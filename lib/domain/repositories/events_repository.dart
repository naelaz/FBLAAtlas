import 'package:fbla_atlas/domain/models/event_item.dart';
import 'package:fbla_atlas/domain/models/reminder.dart';

abstract class EventsRepository {
  Future<List<EventItem>> fetchEvents();
  Future<List<Reminder>> fetchReminders();
  Future<void> upsertReminder(Reminder reminder);
  Future<void> removeReminderForEvent(String eventId);
}
