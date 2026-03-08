import 'package:fbla_atlas/data/seed/seed_data.dart';
import 'package:fbla_atlas/domain/models/news_item.dart';
import 'package:fbla_atlas/domain/repositories/news_repository.dart';

class DemoNewsRepository implements NewsRepository {
  @override
  Future<List<NewsItem>> fetchNews() async {
    return SeedData.news();
  }
}
