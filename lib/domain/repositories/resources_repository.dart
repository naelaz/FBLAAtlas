import 'package:fbla_atlas/domain/models/resource_item.dart';

abstract class ResourcesRepository {
  Future<List<ResourceItem>> fetchResources();
}
