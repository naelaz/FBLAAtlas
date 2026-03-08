import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fbla_atlas/core/widgets/atlas_scaffold.dart';
import 'package:fbla_atlas/domain/repositories/social_repository.dart';
import 'package:fbla_atlas/presentation/providers/app_providers.dart';
import 'package:fbla_atlas/presentation/providers/feature_providers.dart';

class SocialScreen extends ConsumerWidget {
  const SocialScreen({super.key});

  static const String routeName = 'social';
  static const String routePath = '/social';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final channelsAsync = ref.watch(socialChannelsProvider);

    return AtlasScaffold(
      title: 'Social Channels',
      currentPath: routePath,
      body: channelsAsync.when(
        data: (channels) {
          return ListView.separated(
            itemCount: channels.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final channel = channels[index];
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        channel.platform,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(channel.handle),
                      const SizedBox(height: 4),
                      Text(channel.description),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        children: <Widget>[
                          FilledButton.tonalIcon(
                            onPressed: () async {
                              final result = await ref
                                  .read(socialRepositoryProvider)
                                  .openChannel(channel);
                              if (!context.mounted) {
                                return;
                              }
                              final message = switch (result) {
                                SocialOpenResult.openedApp => 'Opened ${channel.platform} app.',
                                SocialOpenResult.openedWeb => 'App unavailable, opened web fallback.',
                                SocialOpenResult.failed => 'Unable to open ${channel.platform}.',
                              };
                              ScaffoldMessenger.of(context)
                                  .showSnackBar(SnackBar(content: Text(message)));
                            },
                            icon: const Icon(Icons.open_in_new),
                            label: const Text('Open Channel'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Failed to load channels: $error')),
      ),
    );
  }
}
