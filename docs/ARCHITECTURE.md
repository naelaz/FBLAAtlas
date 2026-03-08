# Architecture

## Layering

- `presentation`: screens + Riverpod controllers/providers.
- `domain`: entity models + repository interfaces.
- `data`: local-first repository implementations and seeded content.
- `core`: cross-cutting services (validation, notifications, cache, connectivity, launch).

## Flow Diagram

```text
UI Screens
   |
Riverpod Controllers / Providers
   |
Repository Interfaces (domain)
   |
Demo Repository Implementations (data)
   |
Seeded Local Data + Secure Storage + Notifications + URL Launcher
```

## Public Interfaces

- Models: `MemberProfile`, `MemberSession`, `EventItem`, `Reminder`, `ResourceItem`, `NewsItem`, `SocialChannel`
- Repositories: `AuthRepository`, `ProfileRepository`, `EventsRepository`, `ResourcesRepository`, `NewsRepository`, `SocialRepository`
- Services: `ValidationService`, `NotificationService`, `ConnectivityService`, `CacheService`, `UrlLauncherService`

## Reliability Decisions

- No blocking network dependency at startup.
- Seeded local data for predictable competition demos.
- Social links use app-open first, then web fallback.
- Reminder scheduling failure reports non-fatal warning.
