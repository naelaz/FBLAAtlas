import 'package:fbla_atlas/data/seed/seed_data.dart';
import 'package:fbla_atlas/domain/models/resource_item.dart';
import 'package:fbla_atlas/domain/repositories/resources_repository.dart';

class DemoResourcesRepository implements ResourcesRepository {
  @override
  Future<List<ResourceItem>> fetchResources() async {
    return SeedData.resources();
  }
}
