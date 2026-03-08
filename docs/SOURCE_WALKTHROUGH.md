# Source Walkthrough Notes

## Design and Code Quality Narrative

- `core/navigation/app_router.dart`: route map and event detail pathing.
- `domain/repositories/*`: clean contracts for feature boundaries.
- `data/repositories/*`: local-first implementations for deterministic demos.
- `presentation/providers/events_controller.dart`: reminder orchestration + validation hooks.

## UX and Accessibility Narrative

- `core/theme/app_theme.dart`: cohesive visual direction and contrast-safe palette.
- `presentation/providers/accessibility_controller.dart`: app-wide high-contrast + large-text state.
- `presentation/screens/profile_screen.dart` + `settings_screen.dart`: accessibility controls and persistence.

## Application Functionality Narrative

- `calendar_screen.dart` + `event_detail_screen.dart`: event workflows and reminders.
- `resources_screen.dart` + `news_screen.dart`: information access and offline messaging.
- `social_screen.dart`: social deep-link integration with web fallback.
