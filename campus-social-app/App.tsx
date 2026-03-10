import "react-native-gesture-handler";
import "./global.css";

import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, Button, Provider as PaperProvider, Text } from "react-native-paper";

import { AppLogo } from "./src/components/branding/AppLogo";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { AccessibilityProvider, useAccessibility } from "./src/context/AccessibilityContext";
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
  const { ready: accessibilityReady } = useAccessibility();

  React.useEffect(() => {
    if (!themeReady || !onboardingReady || !accessibilityReady) {
      return;
    }
    void SplashScreen.hideAsync();
  }, [accessibilityReady, onboardingReady, themeReady]);

  if (!themeReady || !onboardingReady || !accessibilityReady) {
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
      <StatusBar
        style={palette.isDark ? "light" : "dark"}
        backgroundColor={palette.colors.background}
        translucent={false}
      />
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
  const { loading, isAuthenticated, profile, isAdminMode, setAdminMode, signOutUser } = useAuthContext();
  const { completed, setOnboardingCompleted } = useOnboarding();
  const { palette } = useThemeContext();
  const startInAdmin = Boolean(isAdminMode && (profile?.role === "admin" || profile?.role === "superadmin"));
  const gateState = loading
    ? "loading"
    : !isAuthenticated
      ? "auth"
      : profile?.banned
        ? "suspended"
        : !completed
          ? "onboarding"
          : startInAdmin
            ? "admin"
            : "main";
  const gateStateRef = React.useRef<string>("");

  React.useEffect(() => {
    if (!isAuthenticated || !profile) {
      return;
    }
    const profileOnboardingCompleted = Boolean(profile.onboardingCompleted);
    // Only sync from Firestore→local when Firestore says completed.
    // Never reset local completed=true back to false from a stale Firestore read.
    if (profileOnboardingCompleted && !completed) {
      console.log("[NavAction] Sync onboarding state from profile", {
        profileOnboardingCompleted,
      });
      void setOnboardingCompleted(true);
    }
  }, [completed, isAuthenticated, profile, setOnboardingCompleted]);

  React.useEffect(() => {
    if (gateStateRef.current === gateState) {
      return;
    }
    gateStateRef.current = gateState;
    if (gateState === "auth") {
      console.log("[NavAction] AuthGate -> LoginScreen");
      return;
    }
    if (gateState === "onboarding") {
      console.log("[NavAction] AuthGate -> OnboardingScreen");
      return;
    }
    if (gateState === "admin") {
      console.log("[NavAction] AuthGate -> RootNavigator(AdminDashboard)");
      return;
    }
    if (gateState === "main") {
      console.log("[NavAction] AuthGate -> RootNavigator(MainTabs)");
      return;
    }
    if (gateState === "suspended") {
      console.log("[NavAction] AuthGate -> SuspendedView");
      return;
    }
    console.log("[NavAction] AuthGate -> Loading");
  }, [gateState]);

  React.useEffect(() => {
    if (!isAdminMode) {
      return;
    }
    if (profile?.role === "admin" || profile?.role === "superadmin") {
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

  if (profile?.banned) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: palette.colors.background,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
          gap: 12,
        }}
      >
        <AppLogo subtitle="Account suspended" />
        <Text style={{ color: palette.colors.text, fontSize: 20, fontWeight: "700", textAlign: "center" }}>
          Your account has been suspended
        </Text>
        <Text style={{ color: palette.colors.textMuted, textAlign: "center" }}>
          Contact your chapter administrator for details.
        </Text>
        <Button
          mode="contained-tonal"
          onPress={() => {
            void signOutUser();
          }}
          style={{ marginTop: 8 }}
        >
          Sign Out
        </Button>
      </View>
    );
  }

  if (!completed) {
    return <OnboardingScreen />;
  }

  return <RootNavigator startInAdmin={startInAdmin} />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AccessibilityProvider>
        <ThemeProvider>
          <OnboardingProvider>
            <ErrorBoundary>
              <AppGate />
            </ErrorBoundary>
          </OnboardingProvider>
        </ThemeProvider>
      </AccessibilityProvider>
    </GestureHandlerRootView>
  );
}

