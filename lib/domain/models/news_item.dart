class NewsItem {
  const NewsItem({
    required this.id,
    required this.title,
    required this.body,
    required this.category,
    required this.source,
    required this.publishedAt,
  });

  final String id;
  final String title;
  final String body;
  final String category;
  final String source;
  final DateTime publishedAt;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'body': body,
      'category': category,
      'source': source,
      'publishedAt': publishedAt.toIso8601String(),
    };
  }

  factory NewsItem.fromJson(Map<String, dynamic> json) {
    return NewsItem(
      id: json['id'] as String,
      title: json['title'] as String,
      body: json['body'] as String,
      category: json['category'] as String,
      source: json['source'] as String,
      publishedAt: DateTime.parse(json['publishedAt'] as String),
    );
  }
}
