import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fbla_atlas/core/services/notification_service.dart';
import 'package:fbla_atlas/core/services/validation_service.dart';
import 'package:fbla_atlas/domain/models/event_item.dart';
import 'package:fbla_atlas/domain/models/reminder.dart';
import 'package:fbla_atlas/domain/repositories/events_repository.dart';
import 'package:fbla_atlas/presentation/providers/app_providers.dart';

class EventsState {
  const EventsState({
    required this.isLoading,
    required this.events,
    required this.reminders,
    required this.errorMessage,
  });

  factory EventsState.initial() {
    return const EventsState(
      isLoading: false,
      events: <EventItem>[],
      reminders: <Reminder>[],
      errorMessage: null,
    );
  }

  final bool isLoading;
  final List<EventItem> events;
  final List<Reminder> reminders;
  final String? errorMessage;

  EventsState copyWith({
    bool? isLoading,
    List<EventItem>? events,
    List<Reminder>? reminders,
    String? errorMessage,
    bool clearError = false,
  }) {
    return EventsState(
      isLoading: isLoading ?? this.isLoading,
      events: events ?? this.events,
      reminders: reminders ?? this.reminders,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  Reminder? reminderForEvent(String eventId) {
    final index = reminders.indexWhere((item) => item.eventId == eventId);
    if (index < 0) {
      return null;
    }
    return reminders[index];
  }
}

class EventsController extends StateNotifier<EventsState> {
  EventsController(
    this._eventsRepository,
    this._notificationService,
    this._validationService,
  ) : super(EventsState.initial());

  final EventsRepository _eventsRepository;
  final NotificationService _notificationService;
  final ValidationService _validationService;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final events = await _eventsRepository.fetchEvents();
      final reminders = await _eventsRepository.fetchReminders();
      state = state.copyWith(
        isLoading: false,
        events: events,
        reminders: reminders,
        clearError: true,
      );
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load events at the moment.',
      );
    }
  }

  Reminder? reminderForEvent(String eventId) {
    final index = state.reminders.indexWhere((item) => item.eventId == eventId);
    if (index < 0) {
      return null;
    }
    return state.reminders[index];
  }

  Future<void> setReminder({
    required EventItem event,
    required DateTime scheduledAt,
  }) async {
    if (!_validationService.isValidEventRange(event.startDate, event.endDate)) {
      state = state.copyWith(errorMessage: 'Event date range is invalid.');
      return;
    }
    if (scheduledAt.isAfter(event.startDate)) {
      state = state.copyWith(
        errorMessage: 'Reminder should be at or before event start time.',
      );
      return;
    }

    final reminder = Reminder(
      id: 'reminder_${event.id}',
      eventId: event.id,
      scheduledAt: scheduledAt,
      enabled: true,
    );

    await _eventsRepository.upsertReminder(reminder);
    final scheduled = await _notificationService.scheduleReminder(
      reminder: reminder,
      event: event,
    );

    final updated = <Reminder>[...state.reminders];
    final existing = updated.indexWhere((item) => item.eventId == event.id);
    if (existing >= 0) {
      updated[existing] = reminder;
    } else {
      updated.add(reminder);
    }
    state = state.copyWith(
      reminders: updated,
      errorMessage: scheduled ? null : 'Reminder saved, but notification permission may be disabled.',
      clearError: scheduled,
    );
  }

  Future<void> clearReminder(EventItem event) async {
    final reminder = reminderForEvent(event.id);
    if (reminder == null) {
      return;
    }
    await _notificationService.cancelReminder(reminder);
    await _eventsRepository.removeReminderForEvent(event.id);
    final updated = <Reminder>[
      ...state.reminders.where((item) => item.eventId != event.id),
    ];
    state = state.copyWith(reminders: updated, clearError: true);
  }
}

final eventsControllerProvider =
    StateNotifierProvider<EventsController, EventsState>((ref) {
  return EventsController(
    ref.read(eventsRepositoryProvider),
    ref.read(notificationServiceProvider),
    ref.read(validationServiceProvider),
  );
});
