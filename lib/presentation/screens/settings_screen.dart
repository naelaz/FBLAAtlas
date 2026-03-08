import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fbla_atlas/core/widgets/atlas_scaffold.dart';
import 'package:fbla_atlas/domain/models/event_item.dart';
import 'package:fbla_atlas/domain/models/reminder.dart';
import 'package:fbla_atlas/presentation/providers/accessibility_controller.dart';
import 'package:fbla_atlas/presentation/providers/app_providers.dart';
import 'package:fbla_atlas/presentation/providers/auth_controller.dart';
import 'package:fbla_atlas/presentation/providers/feature_providers.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  static const String routeName = 'settings';
  static const String routePath = '/settings';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final accessibility = ref.watch(accessibilityControllerProvider);
    final session = ref.watch(authControllerProvider).session;
    final profileAsync = ref.watch(profileProvider);
    final isarReady = ref.watch(cacheServiceProvider).isIsarReady;

    Future<void> persistAccessibility() async {
      final profile = profileAsync.valueOrNull;
      if (profile == null) {
        return;
      }
      await ref.read(profileRepositoryProvider).updateProfile(
            profile.copyWith(
              highContrastEnabled: accessibility.highContrast,
              largeTextEnabled: accessibility.largeText,
            ),
          );
      ref.invalidate(profileProvider);
    }

    return AtlasScaffold(
      title: 'Settings',
      currentPath: routePath,
      body: ListView(
        children: <Widget>[
          Card(
            child: Column(
              children: <Widget>[
                SwitchListTile(
                  value: accessibility.highContrast,
                  onChanged: (value) async {
                    ref.read(accessibilityControllerProvider.notifier).setHighContrast(value);
                    await persistAccessibility();
                  },
                  title: const Text('High contrast mode'),
                  subtitle: const Text('Increases contrast for better visual accessibility.'),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  value: accessibility.largeText,
                  onChanged: (value) async {
                    ref.read(accessibilityControllerProvider.notifier).setLargeText(value);
                    await persistAccessibility();
                  },
                  title: const Text('Large text mode'),
                  subtitle: const Text('Scales app text for readability.'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Data Handling',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text('Session storage: Flutter Secure Storage'),
                  Text('Isar cache available: ${isarReady ? 'Yes' : 'Fallback mode'}'),
                  const SizedBox(height: 10),
                  OutlinedButton(
                    onPressed: session == null
                        ? null
                        : () async {
                            final now = DateTime.now();
                            final event = EventItem(
                              id: 'test_event',
                              title: 'Notification Test',
                              description: 'Settings panel test notification.',
                              location: 'Device',
                              startDate: now.add(const Duration(minutes: 1)),
                              endDate: now.add(const Duration(minutes: 2)),
                              isCompetition: false,
                            );
                            final reminder = Reminder(
                              id: 'test_reminder',
                              eventId: event.id,
                              scheduledAt: now.add(const Duration(seconds: 5)),
                              enabled: true,
                            );
                            final ok = await ref.read(notificationServiceProvider).scheduleReminder(
                                  reminder: reminder,
                                  event: event,
                                );
                            if (!context.mounted) {
                              return;
                            }
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  ok
                                      ? 'Test notification scheduled for 5 seconds from now.'
                                      : 'Notification permission may be disabled.',
                                ),
                              ),
                            );
                          },
                    child: const Text('Send Test Notification'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
