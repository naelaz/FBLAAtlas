import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:fbla_atlas/core/widgets/atlas_scaffold.dart';
import 'package:fbla_atlas/domain/models/event_item.dart';
import 'package:fbla_atlas/presentation/providers/events_controller.dart';
import 'package:fbla_atlas/presentation/screens/calendar_screen.dart';

class EventDetailScreen extends ConsumerStatefulWidget {
  const EventDetailScreen({
    super.key,
    required this.eventId,
  });

  static const String routeName = 'event-detail';
  static const String routePath = '/calendar/event/:eventId';
  static String pathFor(String eventId) => '/calendar/event/$eventId';

  final String eventId;

  @override
  ConsumerState<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends ConsumerState<EventDetailScreen> {
  bool _loaded = false;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(eventsControllerProvider);
    if (!_loaded) {
      _loaded = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (state.events.isEmpty) {
          ref.read(eventsControllerProvider.notifier).load();
        }
      });
    }

    final event = _findEvent(state.events, widget.eventId);
    if (event == null) {
      return const AtlasScaffold(
        title: 'Event Detail',
        currentPath: CalendarScreen.routePath,
        body: Center(child: Text('Event not found.')),
      );
    }

    final reminder = state.reminderForEvent(event.id);

    return AtlasScaffold(
      title: 'Event Detail',
      currentPath: CalendarScreen.routePath,
      body: ListView(
        children: <Widget>[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    event.title,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 10),
                  _DetailRow('Location', event.location),
                  _DetailRow(
                    'Starts',
                    DateFormat('EEEE, MMMM d, y - h:mm a').format(event.startDate),
                  ),
                  _DetailRow(
                    'Ends',
                    DateFormat('EEEE, MMMM d, y - h:mm a').format(event.endDate),
                  ),
                  _DetailRow(
                    'Type',
                    event.isCompetition ? 'Competition milestone' : 'Chapter engagement event',
                  ),
                  const SizedBox(height: 12),
                  Text(event.description),
                  const SizedBox(height: 18),
                  if (reminder == null)
                    FilledButton.icon(
                      onPressed: () async {
                        final reminderAt = event.startDate.subtract(const Duration(hours: 2));
                        await ref.read(eventsControllerProvider.notifier).setReminder(
                              event: event,
                              scheduledAt: reminderAt,
                            );
                        if (!mounted) {
                          return;
                        }
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Reminder added.')),
                        );
                      },
                      icon: const Icon(Icons.notifications_active_outlined),
                      label: const Text('Set Reminder (2 Hours Before)'),
                    )
                  else
                    OutlinedButton.icon(
                      onPressed: () async {
                        await ref.read(eventsControllerProvider.notifier).clearReminder(event);
                        if (!mounted) {
                          return;
                        }
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Reminder removed.')),
                        );
                      },
                      icon: const Icon(Icons.notifications_off_outlined),
                      label: Text(
                        'Remove Reminder (${DateFormat('MMM d, h:mm a').format(reminder.scheduledAt)})',
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  EventItem? _findEvent(List<EventItem> events, String eventId) {
    for (final event in events) {
      if (event.id == eventId) {
        return event;
      }
    }
    return null;
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          SizedBox(
            width: 72,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
