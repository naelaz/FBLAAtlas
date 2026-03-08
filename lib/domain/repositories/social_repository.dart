import 'package:fbla_atlas/domain/models/social_channel.dart';

enum SocialOpenResult {
  openedApp,
  openedWeb,
  failed,
}

abstract class SocialRepository {
  Future<List<SocialChannel>> fetchChannels();
  Future<SocialOpenResult> openChannel(SocialChannel channel);
}
