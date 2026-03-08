class SocialChannel {
  const SocialChannel({
    required this.id,
    required this.platform,
    required this.handle,
    required this.appUri,
    required this.webUri,
    required this.description,
  });

  final String id;
  final String platform;
  final String handle;
  final String appUri;
  final String webUri;
  final String description;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'platform': platform,
      'handle': handle,
      'appUri': appUri,
      'webUri': webUri,
      'description': description,
    };
  }

  factory SocialChannel.fromJson(Map<String, dynamic> json) {
    return SocialChannel(
      id: json['id'] as String,
      platform: json['platform'] as String,
      handle: json['handle'] as String,
      appUri: json['appUri'] as String,
      webUri: json['webUri'] as String,
      description: json['description'] as String,
    );
  }
}
