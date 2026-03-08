import 'package:fbla_atlas/domain/models/news_item.dart';

abstract class NewsRepository {
  Future<List<NewsItem>> fetchNews();
}
