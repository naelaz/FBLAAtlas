import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fbla_atlas/domain/models/member_session.dart';
import 'package:fbla_atlas/domain/repositories/auth_repository.dart';
import 'package:fbla_atlas/presentation/providers/app_providers.dart';
import 'package:fbla_atlas/presentation/screens/login_screen.dart';

void main() {
  testWidgets('shows validation errors when credentials are malformed', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
        ],
        child: const MaterialApp(home: LoginScreen()),
      ),
    );

    await tester.enterText(find.byType(TextFormField).at(0), 'invalid');
    await tester.enterText(find.byType(TextFormField).at(1), 'short');
    await tester.tap(find.text('Sign In'));
    await tester.pump();

    expect(find.text('Enter a valid email address.'), findsOneWidget);
    expect(find.text('Use 8+ chars with upper, lower, and number.'), findsOneWidget);
  });
}

class _FakeAuthRepository implements AuthRepository {
  @override
  Future<MemberSession?> currentSession() async => null;

  @override
  Future<MemberSession> login({required String email, required String password}) async {
    return MemberSession(
      memberId: 'fake',
      email: email,
      token: 'token',
      createdAt: DateTime(2026, 1, 1),
    );
  }

  @override
  Future<void> logout() async {}
}
