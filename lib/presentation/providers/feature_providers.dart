import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fbla_atlas/domain/models/member_profile.dart';
import 'package:fbla_atlas/domain/models/news_item.dart';
import 'package:fbla_atlas/domain/models/resource_item.dart';
import 'package:fbla_atlas/domain/models/social_channel.dart';
import 'package:fbla_atlas/presentation/providers/app_providers.dart';
import 'package:fbla_atlas/presentation/providers/auth_controller.dart';

final profileProvider = FutureProvider<MemberProfile?>((ref) async {
  final session = ref.watch(authControllerProvider).session;
  if (session == null) {
    return null;
  }

  final profile = await ref.read(profileRepositoryProvider).fetchProfile(session.memberId);
  if (profile.email != session.email) {
    final synced = profile.copyWith(email: session.email);
    await ref.read(profileRepositoryProvider).updateProfile(synced);
    return synced;
  }
  return profile;
});

final resourcesProvider = FutureProvider<List<ResourceItem>>((ref) async {
  return ref.read(resourcesRepositoryProvider).fetchResources();
});

final newsProvider = FutureProvider<List<NewsItem>>((ref) async {
  return ref.read(newsRepositoryProvider).fetchNews();
});

final socialChannelsProvider = FutureProvider<List<SocialChannel>>((ref) async {
  return ref.read(socialRepositoryProvider).fetchChannels();
});
