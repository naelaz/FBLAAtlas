import 'package:fbla_atlas/core/services/cache_service.dart';
import 'package:fbla_atlas/core/services/validation_service.dart';
import 'package:fbla_atlas/domain/models/member_session.dart';
import 'package:fbla_atlas/domain/repositories/auth_repository.dart';

class DemoAuthRepository implements AuthRepository {
  DemoAuthRepository({
    required CacheService cacheService,
    required ValidationService validationService,
  })  : _cacheService = cacheService,
        _validationService = validationService;

  static const String _sessionKey = 'session.current';
  final CacheService _cacheService;
  final ValidationService _validationService;

  @override
  Future<MemberSession?> currentSession() async {
    final json = await _cacheService.readMap(_sessionKey);
    if (json == null) {
      return null;
    }
    return MemberSession.fromJson(json);
  }

  @override
  Future<MemberSession> login({
    required String email,
    required String password,
  }) async {
    if (!_validationService.isValidEmail(email)) {
      throw const AuthException('Invalid email format.');
    }
    if (!_validationService.isValidPassword(password)) {
      throw const AuthException(
        'Password must have upper/lowercase letters and a number.',
      );
    }
    if (password != 'Fbla2026!') {
      throw const AuthException('Demo password is incorrect.');
    }

    final normalizedEmail = email.trim().toLowerCase();
    final memberId = normalizedEmail.replaceAll(RegExp(r'[^a-z0-9]'), '_');
    final session = MemberSession(
      memberId: memberId,
      email: normalizedEmail,
      token: 'demo-token-${DateTime.now().millisecondsSinceEpoch}',
      createdAt: DateTime.now(),
    );
    await _cacheService.writeMap(_sessionKey, session.toJson());
    return session;
  }

  @override
  Future<void> logout() async {
    await _cacheService.delete(_sessionKey);
  }
}

class AuthException implements Exception {
  const AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}
