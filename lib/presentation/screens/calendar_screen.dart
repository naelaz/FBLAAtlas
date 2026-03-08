import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:fbla_atlas/core/widgets/atlas_scaffold.dart';
import 'package:fbla_atlas/domain/models/event_item.dart';
import 'package:fbla_atlas/presentation/providers/events_controller.dart';
import 'package:fbla_atlas/presentation/screens/event_detail_screen.dart';

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  static const String routeName = 'calendar';
  static const String routePath = '/calendar';

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(eventsControllerProvider);

    if (!_initialized) {
      _initialized = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(eventsControllerProvider.notifier).load();
      });
    }

    ref.listen(eventsControllerProvider, (previous, next) {
      if (!mounted) {
        return;
      }
      if (next.errorMessage != null && next.errorMessage != previous?.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.errorMessage!)),
        );
      }
    });

    return AtlasScaffold(
      title: 'Events & Reminders',
      currentPath: CalendarScreen.routePath,
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.separated(
              itemCount: state.events.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final event = state.events[index];
                final reminder = state.reminderForEvent(event.id);
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(
                                    event.title,
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                          fontWeight: FontWeight.w700,
                                        ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${DateFormat('EEE, MMM d - h:mm a').format(event.startDate)}  '
                                    '- ${DateFormat('h:mm a').format(event.endDate)}',
                                  ),
                                  const SizedBox(height: 2),
                                  Text(event.location),
                                ],
                              ),
                            ),
                            Switch(
                              value: reminder != null,
                              onChanged: (_) => _toggleReminder(event),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(event.description),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: <Widget>[
                            OutlinedButton.icon(
                              onPressed: () => context.go(
                                EventDetailScreen.pathFor(event.id),
                              ),
                              icon: const Icon(Icons.open_in_new, size: 18),
                              label: const Text('View Details'),
                            ),
                            if (reminder != null)
                              Chip(
                                label: Text(
                                  'Reminder set: ${DateFormat('MMM d, h:mm a').format(reminder.scheduledAt)}',
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  Future<void> _toggleReminder(EventItem event) async {
    final controller = ref.read(eventsControllerProvider.notifier);
    final current = ref.read(eventsControllerProvider).reminderForEvent(event.id);
    if (current != null) {
      await controller.clearReminder(event);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Reminder removed for ${event.title}.')),
      );
      return;
    }

    final options = <Duration>[
      const Duration(days: 1),
      const Duration(hours: 2),
      const Duration(minutes: 30),
    ];

    final choice = await showModalBottomSheet<Duration>(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: options
                .map(
                  (duration) => ListTile(
                    title: Text('Before event: ${_durationLabel(duration)}'),
                    onTap: () => Navigator.of(context).pop(duration),
                  ),
                )
                .toList(),
          ),
        );
      },
    );

    if (choice == null) {
      return;
    }

    final scheduled = event.startDate.subtract(choice);
    await controller.setReminder(event: event, scheduledAt: scheduled);
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Reminder set for ${DateFormat('MMM d, h:mm a').format(scheduled)}'),
      ),
    );
  }

  String _durationLabel(Duration duration) {
    if (duration.inDays >= 1) {
      return '${duration.inDays} day';
    }
    if (duration.inHours >= 1) {
      return '${duration.inHours} hours';
    }
    return '${duration.inMinutes} minutes';
  }
}
