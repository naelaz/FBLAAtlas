import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fbla_atlas/core/widgets/atlas_scaffold.dart';
import 'package:fbla_atlas/domain/models/resource_item.dart';
import 'package:fbla_atlas/presentation/providers/app_providers.dart';
import 'package:fbla_atlas/presentation/providers/feature_providers.dart';

class ResourcesScreen extends ConsumerWidget {
  const ResourcesScreen({super.key});

  static const String routeName = 'resources';
  static const String routePath = '/resources';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resourcesAsync = ref.watch(resourcesProvider);

    return AtlasScaffold(
      title: 'Resources Hub',
      currentPath: routePath,
      body: resourcesAsync.when(
        data: (resources) {
          final grouped = _groupByCategory(resources);
          return ListView(
            children: grouped.entries.map((entry) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          entry.key,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        const SizedBox(height: 10),
                        ...entry.value.map((resource) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: _ResourceTile(resource: resource),
                          );
                        }),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Failed to load resources: $error')),
      ),
    );
  }

  Map<String, List<ResourceItem>> _groupByCategory(List<ResourceItem> resources) {
    final map = <String, List<ResourceItem>>{};
    for (final item in resources) {
      map.putIfAbsent(item.category, () => <ResourceItem>[]).add(item);
    }
    return map;
  }
}

class _ResourceTile extends ConsumerWidget {
  const _ResourceTile({required this.resource});

  final ResourceItem resource;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FBFA),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Icon(Icons.insert_drive_file_outlined),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  resource.title,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 3),
                Text(resource.description),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  children: <Widget>[
                    Chip(
                      label: Text(resource.offlineAvailable ? 'Offline Ready' : 'Online Link'),
                    ),
                    OutlinedButton(
                      onPressed: () async {
                        final service = ref.read(urlLauncherServiceProvider);
                        final uri = Uri.parse(resource.url);
                        final opened = await service.canLaunch(uri) && await service.launch(uri);
                        if (!context.mounted) {
                          return;
                        }
                        if (!opened) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Unable to open this link.')),
                          );
                        }
                      },
                      child: const Text('Open'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
