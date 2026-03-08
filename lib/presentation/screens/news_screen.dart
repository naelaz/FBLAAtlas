import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:fbla_atlas/core/widgets/atlas_scaffold.dart';
import 'package:fbla_atlas/presentation/providers/app_providers.dart';
import 'package:fbla_atlas/presentation/providers/feature_providers.dart';

class NewsScreen extends ConsumerWidget {
  const NewsScreen({super.key});

  static const String routeName = 'news';
  static const String routePath = '/news';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final newsAsync = ref.watch(newsProvider);
    final isOnline = ref.watch(connectivityStatusProvider).valueOrNull ?? true;

    return AtlasScaffold(
      title: 'News Feed',
      currentPath: routePath,
      body: Column(
        children: <Widget>[
          if (!isOnline)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF2E8),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Offline fallback mode is active. Displaying locally cached announcements.',
              ),
            ),
          Expanded(
            child: newsAsync.when(
              data: (items) {
                if (items.isEmpty) {
                  return const Center(child: Text('No announcements available.'));
                }

                return ListView.separated(
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Row(
                              children: <Widget>[
                                Chip(label: Text(item.category)),
                                const Spacer(),
                                Text(DateFormat('MMM d, y').format(item.publishedAt)),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              item.title,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                            const SizedBox(height: 6),
                            Text(item.body),
                            const SizedBox(height: 8),
                            Text(
                              'Source: ${item.source}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text('Failed to load news: $error')),
            ),
          ),
        ],
      ),
    );
  }
}
