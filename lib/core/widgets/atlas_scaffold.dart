import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:fbla_atlas/presentation/providers/auth_controller.dart';
import 'package:fbla_atlas/presentation/screens/calendar_screen.dart';
import 'package:fbla_atlas/presentation/screens/dashboard_screen.dart';
import 'package:fbla_atlas/presentation/screens/login_screen.dart';
import 'package:fbla_atlas/presentation/screens/news_screen.dart';
import 'package:fbla_atlas/presentation/screens/profile_screen.dart';
import 'package:fbla_atlas/presentation/screens/resources_screen.dart';
import 'package:fbla_atlas/presentation/screens/settings_screen.dart';
import 'package:fbla_atlas/presentation/screens/social_screen.dart';

class AtlasScaffold extends ConsumerWidget {
  const AtlasScaffold({
    super.key,
    required this.title,
    required this.currentPath,
    required this.body,
    this.actions = const <Widget>[],
  });

  final String title;
  final String currentPath;
  final Widget body;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: actions,
      ),
      drawer: _AppDrawer(
        currentPath: currentPath,
        onLogout: () async {
          await ref.read(authControllerProvider.notifier).logout();
          if (context.mounted) {
            context.go(LoginScreen.routePath);
          }
        },
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: body,
        ),
      ),
    );
  }
}

class _AppDrawer extends StatelessWidget {
  const _AppDrawer({
    required this.currentPath,
    required this.onLogout,
  });

  final String currentPath;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    final items = <_DrawerItem>[
      const _DrawerItem('Dashboard', DashboardScreen.routePath, Icons.home_outlined),
      const _DrawerItem('Profile', ProfileScreen.routePath, Icons.badge_outlined),
      const _DrawerItem('Calendar', CalendarScreen.routePath, Icons.event_outlined),
      const _DrawerItem('Resources', ResourcesScreen.routePath, Icons.folder_copy_outlined),
      const _DrawerItem('News', NewsScreen.routePath, Icons.newspaper_outlined),
      const _DrawerItem('Social', SocialScreen.routePath, Icons.people_alt_outlined),
      const _DrawerItem('Settings', SettingsScreen.routePath, Icons.settings_outlined),
    ];

    return Drawer(
      child: Column(
        children: <Widget>[
          const DrawerHeader(
            child: Align(
              alignment: Alignment.bottomLeft,
              child: Text(
                'FBLA Atlas',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: items.length,
              itemBuilder: (context, index) {
                final item = items[index];
                final selected = item.path == currentPath;
                return ListTile(
                  leading: Icon(item.icon),
                  selected: selected,
                  title: Text(item.label),
                  onTap: () {
                    Navigator.of(context).pop();
                    if (!selected) {
                      context.go(item.path);
                    }
                  },
                );
              },
            ),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Sign Out'),
            onTap: () {
              Navigator.of(context).pop();
              onLogout();
            },
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}

class _DrawerItem {
  const _DrawerItem(this.label, this.path, this.icon);

  final String label;
  final String path;
  final IconData icon;
}
