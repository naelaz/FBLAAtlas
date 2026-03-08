import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:fbla_atlas/core/widgets/atlas_scaffold.dart';
import 'package:fbla_atlas/presentation/providers/app_providers.dart';
import 'package:fbla_atlas/presentation/providers/auth_controller.dart';
import 'package:fbla_atlas/presentation/screens/calendar_screen.dart';
import 'package:fbla_atlas/presentation/screens/login_screen.dart';
import 'package:fbla_atlas/presentation/screens/news_screen.dart';
import 'package:fbla_atlas/presentation/screens/profile_screen.dart';
import 'package:fbla_atlas/presentation/screens/resources_screen.dart';
import 'package:fbla_atlas/presentation/screens/settings_screen.dart';
import 'package:fbla_atlas/presentation/screens/social_screen.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  static const String routeName = 'dashboard';
  static const String routePath = '/dashboard';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final onlineValue = ref.watch(connectivityStatusProvider);
    final isOnline = onlineValue.valueOrNull ?? true;

    if (auth.session == null && !auth.isLoading) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) {
          context.go(LoginScreen.routePath);
        }
      });
    }

    return AtlasScaffold(
      title: 'Member Dashboard',
      currentPath: routePath,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isOnline ? const Color(0xFFECF7F3) : const Color(0xFFFFF2E8),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: <Widget>[
                Icon(
                  isOnline ? Icons.wifi : Icons.wifi_off,
                  color: isOnline ? const Color(0xFF1A755B) : const Color(0xFFC25A1A),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    isOnline
                        ? 'Online mode: live links + full sync options.'
                        : 'Offline mode: seeded local content is active.',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Welcome, ${auth.session?.email ?? 'member'}',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 12),
          Expanded(
            child: GridView.count(
              crossAxisCount: MediaQuery.of(context).size.width > 700 ? 3 : 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              children: const <Widget>[
                _NavCard('Profile', Icons.badge_outlined, ProfileScreen.routePath),
                _NavCard('Calendar', Icons.event_outlined, CalendarScreen.routePath),
                _NavCard('Resources', Icons.folder_copy_outlined, ResourcesScreen.routePath),
                _NavCard('News', Icons.newspaper_outlined, NewsScreen.routePath),
                _NavCard('Social', Icons.people_alt_outlined, SocialScreen.routePath),
                _NavCard('Settings', Icons.settings_outlined, SettingsScreen.routePath),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NavCard extends StatelessWidget {
  const _NavCard(this.title, this.icon, this.path);

  final String title;
  final IconData icon;
  final String path;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Open $title',
      child: Card(
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => context.go(path),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Icon(icon, size: 28),
                const Spacer(),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
