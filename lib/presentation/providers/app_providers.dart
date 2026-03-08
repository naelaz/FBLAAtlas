import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fbla_atlas/core/services/cache_service.dart';
import 'package:fbla_atlas/core/services/connectivity_service.dart';
import 'package:fbla_atlas/core/services/notification_service.dart';
import 'package:fbla_atlas/core/services/url_launcher_service.dart';
import 'package:fbla_atlas/core/services/validation_service.dart';
import 'package:fbla_atlas/data/repositories/demo_auth_repository.dart';
import 'package:fbla_atlas/data/repositories/demo_events_repository.dart';
import 'package:fbla_atlas/data/repositories/demo_news_repository.dart';
import 'package:fbla_atlas/data/repositories/demo_profile_repository.dart';
import 'package:fbla_atlas/data/repositories/demo_resources_repository.dart';
import 'package:fbla_atlas/data/repositories/demo_social_repository.dart';
import 'package:fbla_atlas/domain/repositories/auth_repository.dart';
import 'package:fbla_atlas/domain/repositories/events_repository.dart';
import 'package:fbla_atlas/domain/repositories/news_repository.dart';
import 'package:fbla_atlas/domain/repositories/profile_repository.dart';
import 'package:fbla_atlas/domain/repositories/resources_repository.dart';
import 'package:fbla_atlas/domain/repositories/social_repository.dart';

final cacheServiceProvider = Provider<CacheService>((ref) {
  return SecureIsarCacheService();
});

final validationServiceProvider = Provider<ValidationService>((ref) {
  return ValidationService();
});

final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService();
});

final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  return ConnectivityService();
});

final urlLauncherServiceProvider = Provider<UrlLauncherService>((ref) {
  return DefaultUrlLauncherService();
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return DemoAuthRepository(
    cacheService: ref.read(cacheServiceProvider),
    validationService: ref.read(validationServiceProvider),
  );
});

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return DemoProfileRepository(cacheService: ref.read(cacheServiceProvider));
});

final eventsRepositoryProvider = Provider<EventsRepository>((ref) {
  return DemoEventsRepository(cacheService: ref.read(cacheServiceProvider));
});

final resourcesRepositoryProvider = Provider<ResourcesRepository>((ref) {
  return DemoResourcesRepository();
});

final newsRepositoryProvider = Provider<NewsRepository>((ref) {
  return DemoNewsRepository();
});

final socialRepositoryProvider = Provider<SocialRepository>((ref) {
  return DemoSocialRepository(launcherService: ref.read(urlLauncherServiceProvider));
});

final appInitializationProvider = FutureProvider<void>((ref) async {
  await ref.read(cacheServiceProvider).initialize();
  await ref.read(notificationServiceProvider).initialize();
});

final connectivityStatusProvider = StreamProvider<bool>((ref) {
  return ref.read(connectivityServiceProvider).onStatusChanged;
});
