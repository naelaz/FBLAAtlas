import 'package:connectivity_plus/connectivity_plus.dart';

class ConnectivityService {
  ConnectivityService({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;

  Future<bool> isOnline() async {
    final statuses = await _connectivity.checkConnectivity();
    return statuses.any((status) => status != ConnectivityResult.none);
  }

  Stream<bool> get onStatusChanged async* {
    yield await isOnline();
    await for (final statuses in _connectivity.onConnectivityChanged) {
      yield statuses.any((status) => status != ConnectivityResult.none);
    }
  }
}
