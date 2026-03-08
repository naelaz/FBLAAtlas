import "react-native-gesture-handler";
import "./global.css";

import * as SplashScreen from "expo-splash-screen";
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
import { LoginScreen } from "./src/screens/LoginScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { DashboardProvider } from "./src/context/DashboardContext";
import { useAuthContext } from "./src/context/AuthContext";

void SplashScreen.preventAutoHideAsync().catch(() => {
  // no-op if already prevented
});

function AppGate() {
  const { palette, paperTheme, ready: themeReady } = useThemeContext();
  const { ready: onboardingReady } = useOnboarding();

  React.useEffect(() => {
    if (!themeReady || !onboardingReady) {
      return;
    }
    void SplashScreen.hideAsync();
  }, [onboardingReady, themeReady]);

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
      <AuthProvider>
        <SettingsProvider>
          <DashboardProvider>
            <PushNotificationsProvider>
              <NotificationsProvider>
                <MessagingProvider>
                  <GamificationProvider>
                    <NavBarVisibilityProvider>
                      <AuthGateContent />
                    </NavBarVisibilityProvider>
                  </GamificationProvider>
                </MessagingProvider>
              </NotificationsProvider>
            </PushNotificationsProvider>
          </DashboardProvider>
        </SettingsProvider>
      </AuthProvider>
    </PaperProvider>
  );
}

function AuthGateContent() {
  const { loading, isAuthenticated, profile, isAdminMode, setAdminMode } = useAuthContext();
  const { completed, setOnboardingCompleted } = useOnboarding();
  const { palette } = useThemeContext();

  React.useEffect(() => {
    if (!isAuthenticated || !profile) {
      return;
    }
    if (profile.onboardingCompleted && !completed) {
      void setOnboardingCompleted(true);
    }
  }, [completed, isAuthenticated, profile, setOnboardingCompleted]);

  React.useEffect(() => {
    if (!isAdminMode) {
      return;
    }
    if (profile?.role === "admin") {
      return;
    }
    void setAdminMode(false);
  }, [isAdminMode, profile?.role, setAdminMode]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: palette.colors.background,
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <ActivityIndicator animating size="large" color={palette.colors.primary} />
        <AppLogo subtitle="Checking your account" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (!completed) {
    return <OnboardingScreen />;
  }

  const startInAdmin = Boolean(isAdminMode && profile?.role === "admin");
  return <RootNavigator startInAdmin={startInAdmin} />;
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

