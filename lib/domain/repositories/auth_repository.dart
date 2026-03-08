import 'package:fbla_atlas/domain/models/member_session.dart';

abstract class AuthRepository {
  Future<MemberSession?> currentSession();
  Future<MemberSession> login({required String email, required String password});
  Future<void> logout();
}
