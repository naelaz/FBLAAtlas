import 'package:fbla_atlas/domain/models/member_profile.dart';

abstract class ProfileRepository {
  Future<MemberProfile> fetchProfile(String memberId);
  Future<void> updateProfile(MemberProfile profile);
}
