import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:fbla_atlas/presentation/screens/calendar_screen.dart';
import 'package:fbla_atlas/presentation/screens/dashboard_screen.dart';
import 'package:fbla_atlas/presentation/screens/event_detail_screen.dart';
import 'package:fbla_atlas/presentation/screens/login_screen.dart';
import 'package:fbla_atlas/presentation/screens/news_screen.dart';
import 'package:fbla_atlas/presentation/screens/profile_screen.dart';
import 'package:fbla_atlas/presentation/screens/resources_screen.dart';
import 'package:fbla_atlas/presentation/screens/settings_screen.dart';
import 'package:fbla_atlas/presentation/screens/social_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: LoginScreen.routePath,
    routes: <RouteBase>[
      GoRoute(
        path: LoginScreen.routePath,
        name: LoginScreen.routeName,
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: DashboardScreen.routePath,
        name: DashboardScreen.routeName,
        builder: (_, __) => const DashboardScreen(),
      ),
      GoRoute(
        path: ProfileScreen.routePath,
        name: ProfileScreen.routeName,
        builder: (_, __) => const ProfileScreen(),
      ),
      GoRoute(
        path: CalendarScreen.routePath,
        name: CalendarScreen.routeName,
        builder: (_, __) => const CalendarScreen(),
      ),
      GoRoute(
        path: EventDetailScreen.routePath,
        name: EventDetailScreen.routeName,
        builder: (_, state) => EventDetailScreen(
          eventId: state.pathParameters['eventId'] ?? '',
        ),
      ),
      GoRoute(
        path: ResourcesScreen.routePath,
        name: ResourcesScreen.routeName,
        builder: (_, __) => const ResourcesScreen(),
      ),
      GoRoute(
        path: NewsScreen.routePath,
        name: NewsScreen.routeName,
        builder: (_, __) => const NewsScreen(),
      ),
      GoRoute(
        path: SocialScreen.routePath,
        name: SocialScreen.routeName,
        builder: (_, __) => const SocialScreen(),
      ),
      GoRoute(
        path: SettingsScreen.routePath,
        name: SettingsScreen.routeName,
        builder: (_, __) => const SettingsScreen(),
      ),
    ],
  );
});
