import 'package:url_launcher/url_launcher.dart';

abstract class UrlLauncherService {
  Future<bool> canLaunch(Uri uri);
  Future<bool> launch(Uri uri);
}

class DefaultUrlLauncherService implements UrlLauncherService {
  @override
  Future<bool> canLaunch(Uri uri) => canLaunchUrl(uri);

  @override
  Future<bool> launch(Uri uri) => launchUrl(uri, mode: LaunchMode.externalApplication);
}
