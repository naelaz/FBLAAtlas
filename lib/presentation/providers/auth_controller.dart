import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fbla_atlas/data/repositories/demo_auth_repository.dart';
import 'package:fbla_atlas/domain/models/member_session.dart';
import 'package:fbla_atlas/domain/repositories/auth_repository.dart';
import 'package:fbla_atlas/presentation/providers/app_providers.dart';

class AuthState {
  const AuthState({
    required this.isLoading,
    required this.session,
    required this.errorMessage,
  });

  factory AuthState.initial() {
    return const AuthState(
      isLoading: false,
      session: null,
      errorMessage: null,
    );
  }

  final bool isLoading;
  final MemberSession? session;
  final String? errorMessage;

  AuthState copyWith({
    bool? isLoading,
    MemberSession? session,
    bool clearSession = false,
    String? errorMessage,
    bool clearError = false,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      session: clearSession ? null : (session ?? this.session),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._authRepository) : super(AuthState.initial()) {
    _restoreSession();
  }

  final AuthRepository _authRepository;

  Future<void> _restoreSession() async {
    state = state.copyWith(isLoading: true, clearError: true);
    final session = await _authRepository.currentSession();
    state = state.copyWith(
      isLoading: false,
      session: session,
      clearError: true,
    );
  }

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final session = await _authRepository.login(email: email, password: password);
      state = state.copyWith(
        isLoading: false,
        session: session,
        clearError: true,
      );
      return true;
    } on AuthException catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.message,
        clearSession: true,
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to sign in right now.',
      );
      return false;
    }
  }

  Future<void> logout() async {
    await _authRepository.logout();
    state = state.copyWith(clearSession: true, clearError: true);
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref.read(authRepositoryProvider));
});
