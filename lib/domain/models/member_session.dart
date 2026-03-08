class MemberSession {
  const MemberSession({
    required this.memberId,
    required this.email,
    required this.token,
    required this.createdAt,
  });

  final String memberId;
  final String email;
  final String token;
  final DateTime createdAt;

  Map<String, dynamic> toJson() {
    return {
      'memberId': memberId,
      'email': email,
      'token': token,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory MemberSession.fromJson(Map<String, dynamic> json) {
    return MemberSession(
      memberId: json['memberId'] as String,
      email: json['email'] as String,
      token: json['token'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
