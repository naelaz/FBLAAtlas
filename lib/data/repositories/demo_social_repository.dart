import 'package:fbla_atlas/core/services/url_launcher_service.dart';
import 'package:fbla_atlas/data/seed/seed_data.dart';
import 'package:fbla_atlas/domain/models/social_channel.dart';
import 'package:fbla_atlas/domain/repositories/social_repository.dart';

class DemoSocialRepository implements SocialRepository {
  DemoSocialRepository({required UrlLauncherService launcherService})
      : _launcherService = launcherService;

  final UrlLauncherService _launcherService;

  @override
  Future<List<SocialChannel>> fetchChannels() async {
    return SeedData.socialChannels();
  }

  @override
  Future<SocialOpenResult> openChannel(SocialChannel channel) async {
    final appUri = Uri.parse(channel.appUri);
    final webUri = Uri.parse(channel.webUri);

    if (await _launcherService.canLaunch(appUri)) {
      final launched = await _launcherService.launch(appUri);
      if (launched) {
        return SocialOpenResult.openedApp;
      }
    }

    if (await _launcherService.canLaunch(webUri)) {
      final launched = await _launcherService.launch(webUri);
      if (launched) {
        return SocialOpenResult.openedWeb;
      }
    }

    return SocialOpenResult.failed;
  }
}
