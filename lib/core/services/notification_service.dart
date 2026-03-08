import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:fbla_atlas/domain/models/event_item.dart';
import 'package:fbla_atlas/domain/models/reminder.dart';
import 'package:intl/intl.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

class NotificationService {
  NotificationService({FlutterLocalNotificationsPlugin? plugin})
      : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  final FlutterLocalNotificationsPlugin _plugin;
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) {
      return;
    }

    tz.initializeTimeZones();

    const initSettings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    );

    await _plugin.initialize(initSettings);
    final androidPlugin = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (androidPlugin != null) {
      final dynamic plugin = androidPlugin;
      try {
        await plugin.requestNotificationsPermission();
      } catch (_) {
        try {
          await plugin.requestPermission();
        } catch (_) {}
      }
    }
    _initialized = true;
  }

  Future<bool> scheduleReminder({
    required Reminder reminder,
    required EventItem event,
  }) async {
    try {
      await initialize();
      final now = tz.TZDateTime.now(tz.local);
      var scheduled = tz.TZDateTime.from(reminder.scheduledAt, tz.local);
      if (scheduled.isBefore(now)) {
        scheduled = now.add(const Duration(seconds: 2));
      }

      await _plugin.zonedSchedule(
        reminder.notificationId,
        'FBLA Reminder',
        '${event.title} at ${DateFormat('MMM d - h:mm a').format(event.startDate)}',
        scheduled,
        const NotificationDetails(
          android: AndroidNotificationDetails(
            'event_reminders',
            'Event Reminders',
            channelDescription: 'Reminder notifications for FBLA events',
            importance: Importance.high,
            priority: Priority.high,
          ),
        ),
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> cancelReminder(Reminder reminder) async {
    await _plugin.cancel(reminder.notificationId);
  }
}
