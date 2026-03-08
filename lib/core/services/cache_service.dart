import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';

abstract class CacheService {
  bool get isIsarReady;
  Future<void> initialize();
  Future<Map<String, dynamic>?> readMap(String key);
  Future<void> writeMap(String key, Map<String, dynamic> value);
  Future<List<Map<String, dynamic>>> readMapList(String key);
  Future<void> writeMapList(String key, List<Map<String, dynamic>> value);
  Future<void> delete(String key);
}

class SecureIsarCacheService implements CacheService {
  SecureIsarCacheService({
    FlutterSecureStorage? secureStorage,
  }) : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _secureStorage;
  Isar? _isar;
  bool _initialized = false;

  @override
  bool get isIsarReady => _isar != null;

  @override
  Future<void> initialize() async {
    if (_initialized) {
      return;
    }

    try {
      final directory = await getApplicationDocumentsDirectory();
      _isar = await Isar.open(
        <CollectionSchema<dynamic>>[],
        directory: directory.path,
        name: 'fbla_atlas_demo',
      );
    } catch (_) {
      _isar = null;
    } finally {
      _initialized = true;
    }
  }

  @override
  Future<Map<String, dynamic>?> readMap(String key) async {
    final rawValue = await _secureStorage.read(key: key);
    if (rawValue == null || rawValue.isEmpty) {
      return null;
    }
    final decoded = jsonDecode(rawValue);
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }
    return null;
  }

  @override
  Future<void> writeMap(String key, Map<String, dynamic> value) async {
    await _secureStorage.write(key: key, value: jsonEncode(value));
  }

  @override
  Future<List<Map<String, dynamic>>> readMapList(String key) async {
    final rawValue = await _secureStorage.read(key: key);
    if (rawValue == null || rawValue.isEmpty) {
      return <Map<String, dynamic>>[];
    }
    final decoded = jsonDecode(rawValue);
    if (decoded is List<dynamic>) {
      return decoded.whereType<Map<String, dynamic>>().toList();
    }
    return <Map<String, dynamic>>[];
  }

  @override
  Future<void> writeMapList(String key, List<Map<String, dynamic>> value) async {
    await _secureStorage.write(key: key, value: jsonEncode(value));
  }

  @override
  Future<void> delete(String key) async {
    await _secureStorage.delete(key: key);
  }
}

class MemoryCacheService implements CacheService {
  final Map<String, String> _store = <String, String>{};

  @override
  bool get isIsarReady => false;

  @override
  Future<void> initialize() async {}

  @override
  Future<void> delete(String key) async {
    _store.remove(key);
  }

  @override
  Future<Map<String, dynamic>?> readMap(String key) async {
    final rawValue = _store[key];
    if (rawValue == null) {
      return null;
    }
    final decoded = jsonDecode(rawValue);
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }
    return null;
  }

  @override
  Future<List<Map<String, dynamic>>> readMapList(String key) async {
    final rawValue = _store[key];
    if (rawValue == null) {
      return <Map<String, dynamic>>[];
    }
    final decoded = jsonDecode(rawValue);
    if (decoded is List<dynamic>) {
      return decoded.whereType<Map<String, dynamic>>().toList();
    }
    return <Map<String, dynamic>>[];
  }

  @override
  Future<void> writeMap(String key, Map<String, dynamic> value) async {
    _store[key] = jsonEncode(value);
  }

  @override
  Future<void> writeMapList(String key, List<Map<String, dynamic>> value) async {
    _store[key] = jsonEncode(value);
  }
}
