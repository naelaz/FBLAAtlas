import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fbla_atlas/core/widgets/atlas_scaffold.dart';
import 'package:fbla_atlas/domain/models/member_profile.dart';
import 'package:fbla_atlas/presentation/providers/accessibility_controller.dart';
import 'package:fbla_atlas/presentation/providers/app_providers.dart';
import 'package:fbla_atlas/presentation/providers/auth_controller.dart';
import 'package:fbla_atlas/presentation/providers/feature_providers.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  static const String routeName = 'profile';
  static const String routePath = '/profile';

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _interestsController = TextEditingController();
  final List<String> _roles = <String>[
    'Competitor',
    'Chapter Officer',
    'Member',
    'Adviser Assistant',
  ];
  String _selectedRole = 'Competitor';
  bool _highContrast = false;
  bool _largeText = false;
  MemberProfile? _loadedProfile;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _interestsController.dispose();
    super.dispose();
  }

  void _applyProfile(MemberProfile profile) {
    if (_loadedProfile?.id == profile.id &&
        _loadedProfile?.fullName == profile.fullName &&
        _loadedProfile?.email == profile.email &&
        _loadedProfile?.chapterRole == profile.chapterRole &&
        _loadedProfile?.interests.join(',') == profile.interests.join(',')) {
      return;
    }
    _loadedProfile = profile;
    _nameController.text = profile.fullName;
    _emailController.text = profile.email;
    _interestsController.text = profile.interests.join(', ');
    _selectedRole = profile.chapterRole;
    _highContrast = profile.highContrastEnabled;
    _largeText = profile.largeTextEnabled;
  }

  Future<void> _save(MemberProfile source) async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    final validation = ref.read(validationServiceProvider);
    if (validation.emailError(_emailController.text) != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fix email format.')),
      );
      return;
    }

    final updated = source.copyWith(
      fullName: _nameController.text.trim(),
      email: _emailController.text.trim().toLowerCase(),
      chapterRole: _selectedRole,
      interests: _interestsController.text
          .split(',')
          .map((item) => item.trim())
          .where((item) => item.isNotEmpty)
          .toList(),
      highContrastEnabled: _highContrast,
      largeTextEnabled: _largeText,
    );

    await ref.read(profileRepositoryProvider).updateProfile(updated);
    ref.read(accessibilityControllerProvider.notifier).apply(
          highContrast: _highContrast,
          largeText: _largeText,
        );
    ref.invalidate(profileProvider);

    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Profile updated.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(authControllerProvider).session;
    final profileAsync = ref.watch(profileProvider);
    final validation = ref.watch(validationServiceProvider);

    return AtlasScaffold(
      title: 'Member Profile',
      currentPath: ProfileScreen.routePath,
      body: profileAsync.when(
        data: (profile) {
          if (session == null || profile == null) {
            return const Center(child: Text('Sign in to edit your profile.'));
          }

          _applyProfile(profile);
          return SingleChildScrollView(
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Full Name'),
                    validator: (value) => validation.nameError(value ?? ''),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _emailController,
                    decoration: const InputDecoration(labelText: 'Email'),
                    keyboardType: TextInputType.emailAddress,
                    validator: (value) => validation.emailError(value ?? ''),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _roles.contains(_selectedRole) ? _selectedRole : _roles.first,
                    decoration: const InputDecoration(labelText: 'Chapter Role'),
                    items: _roles
                        .map((item) => DropdownMenuItem<String>(
                              value: item,
                              child: Text(item),
                            ))
                        .toList(),
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() => _selectedRole = value);
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _interestsController,
                    decoration: const InputDecoration(
                      labelText: 'Interests',
                      helperText: 'Comma-separated tags',
                    ),
                    minLines: 1,
                    maxLines: 2,
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile(
                    value: _highContrast,
                    onChanged: (value) => setState(() => _highContrast = value),
                    title: const Text('High contrast mode'),
                  ),
                  SwitchListTile(
                    value: _largeText,
                    onChanged: (value) => setState(() => _largeText = value),
                    title: const Text('Larger text mode'),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Achievement Badges',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: profile.achievementBadges
                        .map((badge) => Chip(label: Text(badge)))
                        .toList(),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: FilledButton(
                      onPressed: () => _save(profile),
                      child: const Text('Save Profile'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Failed to load profile: $error')),
      ),
    );
  }
}
