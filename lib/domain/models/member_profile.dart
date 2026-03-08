class MemberProfile {
  const MemberProfile({
    required this.id,
    required this.fullName,
    required this.email,
    required this.chapterRole,
    required this.interests,
    required this.achievementBadges,
    required this.highContrastEnabled,
    required this.largeTextEnabled,
  });

  final String id;
  final String fullName;
  final String email;
  final String chapterRole;
  final List<String> interests;
  final List<String> achievementBadges;
  final bool highContrastEnabled;
  final bool largeTextEnabled;

  MemberProfile copyWith({
    String? id,
    String? fullName,
    String? email,
    String? chapterRole,
    List<String>? interests,
    List<String>? achievementBadges,
    bool? highContrastEnabled,
    bool? largeTextEnabled,
  }) {
    return MemberProfile(
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      chapterRole: chapterRole ?? this.chapterRole,
      interests: interests ?? this.interests,
      achievementBadges: achievementBadges ?? this.achievementBadges,
      highContrastEnabled: highContrastEnabled ?? this.highContrastEnabled,
      largeTextEnabled: largeTextEnabled ?? this.largeTextEnabled,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fullName': fullName,
      'email': email,
      'chapterRole': chapterRole,
      'interests': interests,
      'achievementBadges': achievementBadges,
      'highContrastEnabled': highContrastEnabled,
      'largeTextEnabled': largeTextEnabled,
    };
  }

  factory MemberProfile.fromJson(Map<String, dynamic> json) {
    return MemberProfile(
      id: json['id'] as String,
      fullName: json['fullName'] as String,
      email: json['email'] as String,
      chapterRole: json['chapterRole'] as String,
      interests: (json['interests'] as List<dynamic>).cast<String>(),
      achievementBadges: (json['achievementBadges'] as List<dynamic>).cast<String>(),
      highContrastEnabled: json['highContrastEnabled'] as bool? ?? false,
      largeTextEnabled: json['largeTextEnabled'] as bool? ?? false,
    );
  }
}
