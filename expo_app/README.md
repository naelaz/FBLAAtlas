# FBLA Atlas Expo

This is an Expo Go compatible version of the FBLA Atlas app.

## Features

- Demo login with validation
- Member profile edit and accessibility settings
- Real month calendar view with marked FBLA events and reminder actions
- Resources hub
- News feed with offline-aware messaging
- FBLA website search (fbla.org + connect.fbla.org) from a dedicated search screen
- Social channel integration: deep-link to installed apps, web fallback, in-app feed viewer, and share action
- Live FBLA event PDF fetch from official FBLA competitive event pages
- Multiple visual themes + frosted glass styling
- Expanded accessibility options: high contrast, large text, reduce motion, readable font, larger touch targets, and voice assist read-aloud

## Run in Expo Go

1. Install dependencies:

```bash
npm install
```

2. Start Expo dev server:

```bash
npx expo start
```

3. Scan the QR code with Expo Go on your phone.

## Demo Login

- Email: any valid email format
- Password: `Fbla2026!`

## Notes

- Data is local-first using AsyncStorage.
- Reminder notifications use `expo-notifications` and require device permission.
- In Expo Go, reminder scheduling gracefully falls back if native notification path is unavailable.
