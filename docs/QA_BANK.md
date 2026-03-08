# Q&A Bank (3-Minute Round)

## Likely Judge Questions and Strong Answers

1. **How is this app architected for scale?**
- Layered design with repository interfaces allows swapping demo data for a backend without rewriting UI.

2. **How did you address accessibility?**
- Added high-contrast and larger-text modes, semantic-friendly controls, and readability-focused spacing.

3. **How is user input validated?**
- Syntactic checks for email/password/name and semantic checks for event date logic and reminder timing.

4. **What happens if internet is unavailable?**
- The app still boots and uses local seeded content; users receive offline-state messaging.

5. **How is social integration implemented?**
- It attempts deep-link launch into the platform app first, then falls back to web.

6. **How do you store sensitive data?**
- Session state is stored through secure storage abstractions; reminder/profile content is local-first.

7. **What would be your next enhancement?**
- Add role-based API sync and push notifications with chapter-specific personalization.
