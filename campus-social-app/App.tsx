import "react-native-gesture-handler";
import "./global.css";

import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, Provider as PaperProvider } from "react-native-paper";

import { AppLogo } from "./src/components/branding/AppLogo";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { AuthProvider } from "./src/context/AuthContext";
import { GamificationProvider } from "./src/context/GamificationContext";
import { MessagingProvider } from "./src/context/MessagingContext";
import { NavBarVisibilityProvider } from "./src/context/NavBarVisibilityContext";
import { NotificationsProvider } from "./src/context/NotificationsContext";
import { OnboardingProvider, useOnboarding } from "./src/context/OnboardingContext";
import { PushNotificationsProvider } from "./src/context/PushNotificationsContext";
import { SettingsProvider } from "./src/context/SettingsContext";
import { ThemeProvider, useThemeContext } from "./src/context/ThemeContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";

function AppGate() {
  const { palette, paperTheme, ready: themeReady } = useThemeContext();
  const { ready: onboardingReady, completed } = useOnboarding();

  if (!themeReady || !onboardingReady) {
    return (
      <PaperProvider theme={paperTheme}>
        <View
          style={{
            flex: 1,
            backgroundColor: palette.colors.background,
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
          }}
        >
          <AppLogo subtitle="Loading your campus network" />
          <ActivityIndicator animating size="large" color={palette.colors.primary} />
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <StatusBar style={palette.isDark ? "light" : "dark"} />
      {!completed ? (
        <OnboardingScreen />
      ) : (
        <AuthProvider>
          <SettingsProvider>
            <PushNotificationsProvider>
              <NotificationsProvider>
                <MessagingProvider>
                  <GamificationProvider>
                    <NavBarVisibilityProvider>
                      <RootNavigator />
                    </NavBarVisibilityProvider>
                  </GamificationProvider>
                </MessagingProvider>
              </NotificationsProvider>
            </PushNotificationsProvider>
          </SettingsProvider>
        </AuthProvider>
      )}
    </PaperProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <OnboardingProvider>
          <ErrorBoundary>
            <AppGate />
          </ErrorBoundary>
        </OnboardingProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
