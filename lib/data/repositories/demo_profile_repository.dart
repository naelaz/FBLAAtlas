import 'package:fbla_atlas/core/services/cache_service.dart';
import 'package:fbla_atlas/data/seed/seed_data.dart';
import 'package:fbla_atlas/domain/models/member_profile.dart';
import 'package:fbla_atlas/domain/repositories/profile_repository.dart';

class DemoProfileRepository implements ProfileRepository {
  DemoProfileRepository({required CacheService cacheService}) : _cacheService = cacheService;

  final CacheService _cacheService;

  String _profileKey(String memberId) => 'profile.$memberId';

  @override
  Future<MemberProfile> fetchProfile(String memberId) async {
    final saved = await _cacheService.readMap(_profileKey(memberId));
    if (saved != null) {
      return MemberProfile.fromJson(saved);
    }

    final seeded = SeedData.profileForMember(
      memberId: memberId,
      email: '$memberId@chapter.fbla',
    );
    await _cacheService.writeMap(_profileKey(memberId), seeded.toJson());
    return seeded;
  }

  @override
  Future<void> updateProfile(MemberProfile profile) async {
    await _cacheService.writeMap(_profileKey(profile.id), profile.toJson());
  }
}
