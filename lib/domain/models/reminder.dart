class Reminder {
  const Reminder({
    required this.id,
    required this.eventId,
    required this.scheduledAt,
    required this.enabled,
  });

  final String id;
  final String eventId;
  final DateTime scheduledAt;
  final bool enabled;

  int get notificationId => id.hashCode & 0x7fffffff;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'eventId': eventId,
      'scheduledAt': scheduledAt.toIso8601String(),
      'enabled': enabled,
    };
  }

  factory Reminder.fromJson(Map<String, dynamic> json) {
    return Reminder(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      scheduledAt: DateTime.parse(json['scheduledAt'] as String),
      enabled: json['enabled'] as bool? ?? true,
    );
  }
}
