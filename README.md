# FBLA Atlas (Mobile Application Development 2025-2026)

FBLA Atlas is an Android-first Flutter app built for the **FBLA Mobile Application Development** event prompt:

- Member profiles
- Event calendar + reminders
- Key FBLA resources/documents
- News feed
- Social media integration

The app is designed for reliable live judging demos with **local-first data**, accessibility features, and explicit rubric alignment.

## Tech Stack

- Flutter + Dart
- `flutter_riverpod` (state management)
- `go_router` (navigation)
- `isar` + secure-storage fallback wiring (local-first cache bootstrap)
- `flutter_secure_storage` (session storage)
- `flutter_local_notifications` + `timezone` (local reminders)
- `url_launcher` (social deep links + web fallback)
- `connectivity_plus` (online/offline status)

## Quick Start

1. Install Flutter SDK (stable channel) and Android Studio.
2. From project root run:

```bash
flutter pub get
flutter test
flutter run
```

If platform folders are missing, run this once before `flutter run`:

```bash
flutter create .
```

Then re-apply `pubspec.yaml` dependencies if needed.

## Expo Go Version

An Expo-compatible app is also included under `expo_app/`.

```bash
cd expo_app
npm install
npx expo start
```

Then scan the QR code in Expo Go on your phone.

## Demo Credentials   

- Email: any valid email format
- Password: `Fbla2026!`

## Rubric Mapping (Implementation)

- **Design and Code Quality**: feature-first architecture, repository interfaces, controller-based state.
- **UX**: documented user journey, accessibility toggles, clear navigation shell.
- **Application Functionality**: full prompt coverage + direct social channel integration with fallback.
- **Data Handling**: local seeded content + secure session + reminder persistence.
- **Documentation/Copyright**: evidence docs under `docs/`.
- **Presentation Delivery**: prepared 7-minute script + Q&A bank.

## Project Structure

```text
lib/
  core/         # theme, navigation, services, shared widgets
  domain/       # models + repository contracts
  data/         # seed data + repository implementations
  presentation/ # providers, controllers, screens

docs/           # competition evidence kit

test/           # unit + widget tests
integration_test/
```

## Notes

- This repository was scaffolded manually in an environment without Flutter CLI installed.
- Code is complete for the app layer; run toolchain commands locally to generate/build platform artifacts.
