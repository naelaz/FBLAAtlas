class ResourceItem {
  const ResourceItem({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.url,
    required this.offlineAvailable,
  });

  final String id;
  final String title;
  final String description;
  final String category;
  final String url;
  final bool offlineAvailable;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'category': category,
      'url': url,
      'offlineAvailable': offlineAvailable,
    };
  }

  factory ResourceItem.fromJson(Map<String, dynamic> json) {
    return ResourceItem(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      category: json['category'] as String,
      url: json['url'] as String,
      offlineAvailable: json['offlineAvailable'] as bool? ?? false,
    );
  }
}
