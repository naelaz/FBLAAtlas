import 'package:flutter_test/flutter_test.dart';
import 'package:fbla_atlas/core/services/url_launcher_service.dart';
import 'package:fbla_atlas/data/repositories/demo_social_repository.dart';
import 'package:fbla_atlas/domain/repositories/social_repository.dart';

void main() {
  group('DemoSocialRepository', () {
    test('opens app uri when app can launch', () async {
      final repo = DemoSocialRepository(
        launcherService: _FakeLauncher(appCanLaunch: true, webCanLaunch: true),
      );
      final channels = await repo.fetchChannels();
      final result = await repo.openChannel(channels.first);
      expect(result, SocialOpenResult.openedApp);
    });

    test('falls back to web uri when app cannot launch', () async {
      final repo = DemoSocialRepository(
        launcherService: _FakeLauncher(appCanLaunch: false, webCanLaunch: true),
      );
      final channels = await repo.fetchChannels();
      final result = await repo.openChannel(channels.first);
      expect(result, SocialOpenResult.openedWeb);
    });
  });
}

class _FakeLauncher implements UrlLauncherService {
  _FakeLauncher({
    required this.appCanLaunch,
    required this.webCanLaunch,
  });

  final bool appCanLaunch;
  final bool webCanLaunch;

  @override
  Future<bool> canLaunch(Uri uri) async {
    return uri.scheme.startsWith('http') ? webCanLaunch : appCanLaunch;
  }

  @override
  Future<bool> launch(Uri uri) async {
    return canLaunch(uri);
  }
}
