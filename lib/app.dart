import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fbla_atlas/core/navigation/app_router.dart';
import 'package:fbla_atlas/core/theme/app_theme.dart';
import 'package:fbla_atlas/presentation/providers/accessibility_controller.dart';
import 'package:fbla_atlas/presentation/providers/app_providers.dart';

class AtlasApp extends ConsumerWidget {
  const AtlasApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final init = ref.watch(appInitializationProvider);
    final accessibility = ref.watch(accessibilityControllerProvider);

    return init.when(
      data: (_) {
        final router = ref.watch(appRouterProvider);
        return MaterialApp.router(
          debugShowCheckedModeBanner: false,
          title: 'FBLA Atlas',
          theme: AppTheme.build(highContrast: accessibility.highContrast),
          builder: (context, child) {
            final mediaQuery = MediaQuery.of(context);
            final scaler = accessibility.largeText ? 1.12 : 1.0;
            return MediaQuery(
              data: mediaQuery.copyWith(textScaler: TextScaler.linear(scaler)),
              child: child ?? const SizedBox.shrink(),
            );
          },
          routerConfig: router,
        );
      },
      loading: () {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          home: Scaffold(
            body: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: <Color>[
                    Color(0xFFF4F8F7),
                    Color(0xFFE8F2EF),
                    Color(0xFFFDF1E8),
                  ],
                ),
              ),
              child: const Center(child: CircularProgressIndicator()),
            ),
          ),
        );
      },
      error: (error, _) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          home: Scaffold(
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Text('Initialization failed: $error'),
              ),
            ),
          ),
        );
      },
    );
  }
}
