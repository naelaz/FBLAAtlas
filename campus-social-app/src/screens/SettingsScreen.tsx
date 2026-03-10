import Slider from "@react-native-community/slider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Linking } from "react-native";
import { CommonActions, NavigationProp, useNavigation, useRoute } from "@react-navigation/native";
import { deleteUser, sendPasswordResetEmail } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Ban, Check, ChevronDown, CircleX } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Alert, LayoutAnimation, Modal, Platform, Pressable, View } from "react-native";
import { Text } from "react-native-paper";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { ScreenShell } from "../components/ScreenShell";
import { Badge } from "../components/ui/badge";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassDropdown } from "../components/ui/GlassDropdown";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSegmentedControl } from "../components/ui/GlassSegmentedControl";
import { GlassSurface } from "../components/ui/GlassSurface";
import { GlassToggle } from "../components/ui/GlassToggle";
import { auth, db } from "../config/firebase";
import { useAccessibility } from "../context/AccessibilityContext";
import { useAuthContext } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useThemeContext } from "../context/ThemeContext";
import { useAnimationDuration } from "../hooks/useAnimationDuration";
import { hapticTap } from "../services/haptics";
import { cancelAllScheduledNotifications, requestPushPermissions } from "../services/pushService";
import { createDefaultSettings } from "../services/settingsService";
import { deleteUserProfile } from "../services/userService";
import { RootStackParamList } from "../navigation/types";
import { AppThemeName, ThemePalette } from "../constants/themes";

type SectionProps = {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

type ThemeTileProps = {
  theme: ThemePalette;
  active: boolean;
  onPress: () => void;
  labelColor: string;
  activeBorderColor: string;
  activeDotColor: string;
};

function ThemeTile({
  theme,
  active,
  onPress,
  labelColor,
  activeBorderColor,
  activeDotColor,
}: ThemeTileProps) {
  const { scaleFont, getFontWeight, getAccessibilityHint } = useAccessibility();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: "31%",
        minWidth: 92,
        marginBottom: 10,
      }}
      accessibilityRole="button"
      accessibilityLabel={`Apply ${theme.label} theme`}
      accessibilityHint={getAccessibilityHint(`Switches app colors to ${theme.label}`)}
    >
      <View
        style={{
          borderRadius: 12,
          borderWidth: active ? 2 : 1,
          borderColor: active ? activeBorderColor : theme.colors.border,
          padding: 6,
          backgroundColor: theme.colors.background,
        }}
      >
        <View
          style={{
            height: 42,
            borderRadius: 9,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            justifyContent: "center",
            paddingHorizontal: 6,
          }}
        >
          <View
            style={{
              height: 9,
              borderRadius: 6,
              backgroundColor: theme.colors.surfaceAlt,
            }}
          />
          <View
            style={{
              position: "absolute",
              right: 6,
              top: 6,
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: theme.colors.accent,
            }}
          />
        </View>
        {active ? (
          <View
            style={{
              position: "absolute",
              right: 6,
              top: 6,
              width: 18,
              height: 18,
              borderRadius: 999,
              backgroundColor: activeDotColor,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check size={11} color={theme.colors.text} />
          </View>
        ) : null}
      </View>
      <Text
        style={{
          color: labelColor,
          fontSize: scaleFont(12),
          marginTop: 6,
          textAlign: "center",
          fontWeight: getFontWeight(active ? "700" : "500"),
        }}
        numberOfLines={1}
      >
        {theme.label}
      </Text>
    </Pressable>
  );
}

function SettingsSection({ id, title, isOpen, onToggle, children }: SectionProps) {
  const { palette } = useThemeContext();
  const { scaleFont, getFontWeight, getAccessibilityHint } = useAccessibility();
  const animationDuration = useAnimationDuration(250);
  const progress = useSharedValue(isOpen ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(isOpen ? 1 : 0, { duration: animationDuration });
  }, [animationDuration, isOpen, progress]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: palette.colors.divider,
      }}
    >
      <Pressable
        onPress={onToggle}
        style={{
          minHeight: 56,
          height: 56,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: isOpen ? palette.colors.surface : palette.colors.background,
        }}
        accessibilityRole="button"
        accessibilityLabel={`Toggle ${id} settings`}
        accessibilityHint={getAccessibilityHint(`Expands or collapses the ${title} section`)}
      >
        <Text
          style={{
            color: palette.colors.text,
            fontSize: scaleFont(16),
            fontWeight: getFontWeight("700"),
          }}
        >
          {title}
        </Text>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={18} color={palette.colors.textSecondary} />
        </Animated.View>
      </Pressable>
      {isOpen ? (
        <View
          style={{
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 12,
            gap: 12,
            backgroundColor: palette.colors.surface,
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { palette } = useThemeContext();
  const { scaleFont, getFontWeight, getAccessibilityHint } = useAccessibility();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text
        style={{
          flex: 1,
          color: disabled ? palette.colors.textFaint : palette.colors.text,
          fontSize: scaleFont(15),
          fontWeight: getFontWeight("500"),
        }}
      >
        {label}
      </Text>
      <GlassToggle
        value={value}
        onValueChange={(next) => {
          hapticTap();
          onValueChange(next);
        }}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityHint={getAccessibilityHint(`Turns ${label.toLowerCase()} ${value ? "off" : "on"}`)}
      />
    </View>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { profile, signOutUser, setAdminMode } = useAuthContext();
  const { settings, updateSettings, resetSettings } = useSettings();
  const {
    fontScale,
    highContrastMode,
    reduceAnimations,
    boldText,
    screenReaderHints,
    oneHandedMode,
    leftHandedMode,
    hapticIntensity,
    colorBlindMode,
    focusMode,
    setFontScale,
    setHighContrastMode,
    setReduceAnimations,
    setBoldText,
    setScreenReaderHints,
    setOneHandedMode,
    setLeftHandedMode,
    setHapticIntensityMode,
    setColorBlindMode,
    setFocusMode,
    scaleFont,
    getFontWeight,
    getAccessibilityHint,
  } = useAccessibility();
  const { palette, themeName, availableThemes, setThemeName } = useThemeContext();
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("bug_report");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  const appVersion = useMemo(() => {
    return Constants.expoConfig?.version ?? "1.0.0";
  }, []);

  const darkThemes = useMemo(
    () => availableThemes.filter((theme) => theme.group === "dark"),
    [availableThemes],
  );
  const lightThemes = useMemo(
    () => availableThemes.filter((theme) => theme.group === "light"),
    [availableThemes],
  );

  const patch = async (updater: (prev: typeof settings) => typeof settings) => {
    try {
      await updateSettings(updater);
    } catch (error) {
      console.warn("Save settings failed:", error);
    }
  };

  const applyTheme = async (nextThemeName: AppThemeName) => {
    if (nextThemeName === themeName) {
      return;
    }
    hapticTap();
    await setThemeName(nextThemeName);
    await patch((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        themeName: nextThemeName,
      },
    }));
  };

  const toggleSection = (sectionId: string) => {
    if (!reduceAnimations) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setOpenSection((prev) => (prev === sectionId ? null : sectionId));
  };

  const notificationsMasterOn = settings.notifications.globalPush;

  const handleGlobalPushToggle = (enabled: boolean) => {
    void (async () => {
      if (enabled) {
        const granted = await requestPushPermissions();
        if (!granted) {
          Alert.alert(
            "Notifications Disabled",
            "Permission was denied, so push notifications cannot be enabled.",
          );
          await patch((prev) => ({
            ...prev,
            notifications: { ...prev.notifications, globalPush: false },
          }));
          return;
        }
      } else {
        await cancelAllScheduledNotifications();
      }

      await patch((prev) => ({
        ...prev,
        notifications: { ...prev.notifications, globalPush: enabled },
      }));
    })();
  };

  const resetToLogin = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      }),
    );
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              hapticTap();
              await setAdminMode(false);
              await signOutUser();
              await AsyncStorage.clear();
              resetToLogin();
            } catch (error) {
              console.warn("Logout failed:", error);
            }
          })();
        },
      },
    ]);
  };

  const performDeleteAccount = () => {
    void (async () => {
      try {
        if (!profile || !auth.currentUser) {
          return;
        }
        hapticTap();
        await deleteUserProfile(profile.uid);
        await deleteUser(auth.currentUser);
        await setAdminMode(false);
        await signOutUser();
        await AsyncStorage.clear();
        resetToLogin();
      } catch (error) {
        console.warn("Delete account failed:", error);
        Alert.alert(
          "Delete Account",
          "Unable to delete account right now. Re-authentication may be required.",
        );
      }
    })();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            setDeleteConfirmInput("");
            setDeleteConfirmVisible(true);
          },
        },
      ],
    );
  };

  return (
    <ScreenShell
      title="Settings"
      subtitle="Account, notifications, accessibility, appearance, privacy, and app info."
      showBackButton={route.name !== "SettingsTab"}
    >
      <SettingsSection
        id="account"
        title="Account"
        isOpen={openSection === "account"}
        onToggle={() => toggleSection("account")}
      >
        <GlassButton
          variant="ghost"
          label="Edit Profile"
          onPress={() => {
            hapticTap();
            navigation.navigate("Profile", { openEdit: true });
          }}
        />
        <GlassButton
          variant="ghost"
          label="Change Email"
          onPress={() => {
            hapticTap();
            Alert.alert("Change Email", "Update your email from your authentication provider settings.");
          }}
        />
        <GlassButton
          variant="ghost"
          label="Change Password"
          onPress={() => {
            hapticTap();
            const email = auth.currentUser?.email?.trim();
            if (!email) {
              Alert.alert("Change Password", "No email is linked to this account.");
              return;
            }
            Alert.alert(
              "Reset Password",
              `We will send a password reset email to ${email}. Continue?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Send Email",
                  onPress: () => {
                    void (async () => {
                      try {
                        await sendPasswordResetEmail(auth, email);
                        Alert.alert("Password Reset", "Password reset email sent. Check your inbox.");
                      } catch (error) {
                        console.warn("Password reset failed:", error);
                        Alert.alert("Password Reset", "Unable to send reset email right now.");
                      }
                    })();
                  },
                },
              ],
            );
          }}
        />
        {(profile?.role === "admin" || profile?.officerPosition === "President") ? (
          <GlassButton
            variant="ghost"
            label="Open Admin Dashboard"
            onPress={() => {
              hapticTap();
              navigation.navigate("AdminDashboard");
            }}
          />
        ) : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Badge
            variant={settings.account.connectedGoogle ? "green-subtle" : "red-subtle"}
            icon={settings.account.connectedGoogle ? <Check /> : <CircleX />}
            capitalize={false}
          >
            Google
          </Badge>
          <Badge
            variant={settings.account.connectedApple ? "green-subtle" : "red-subtle"}
            icon={settings.account.connectedApple ? <Check /> : <CircleX />}
            capitalize={false}
          >
            Apple
          </Badge>
        </View>
      </SettingsSection>

      <SettingsSection
        id="notifications"
        title="Notifications"
        isOpen={openSection === "notifications"}
        onToggle={() => toggleSection("notifications")}
      >
        <ToggleRow
          label="Global Push"
          value={settings.notifications.globalPush}
          onValueChange={handleGlobalPushToggle}
        />
        <ToggleRow
          label="Event Reminders"
          value={settings.notifications.eventReminders}
          disabled={!notificationsMasterOn}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              notifications: { ...prev.notifications, eventReminders: value },
            }))
          }
        />
        <ToggleRow
          label="Practice Reminders"
          value={settings.notifications.practiceReminders}
          disabled={!notificationsMasterOn}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              notifications: { ...prev.notifications, practiceReminders: value },
            }))
          }
        />
        <ToggleRow
          label="Chapter Updates"
          value={settings.notifications.chapterUpdates}
          disabled={!notificationsMasterOn}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              notifications: { ...prev.notifications, chapterUpdates: value },
            }))
          }
        />
        <ToggleRow
          label="Message Notifications"
          value={settings.notifications.messageNotifications}
          disabled={!notificationsMasterOn}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              notifications: { ...prev.notifications, messageNotifications: value },
            }))
          }
        />
        <ToggleRow
          label="XP Alerts"
          value={settings.notifications.xpAlerts}
          disabled={!notificationsMasterOn}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              notifications: { ...prev.notifications, xpAlerts: value },
            }))
          }
        />
      </SettingsSection>

      <SettingsSection
        id="accessibility"
        title="Accessibility"
        isOpen={openSection === "accessibility"}
        onToggle={() => toggleSection("accessibility")}
      >
        <View>
          <Text
            style={{
              marginBottom: 4,
              fontSize: scaleFont(15),
              color: palette.colors.text,
              fontWeight: getFontWeight("600"),
            }}
          >
            Text Size ({fontScale.toFixed(2)}x)
          </Text>
          <GlassSurface
            borderRadius={16}
            style={{
              borderRadius: 16,
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: palette.colors.inputSurface,
            }}
          >
            <Slider
              value={fontScale}
              minimumValue={0.8}
              maximumValue={1.4}
              step={0.01}
              minimumTrackTintColor={palette.colors.primary}
              maximumTrackTintColor={palette.colors.inputMuted}
              thumbTintColor={palette.colors.primary}
              onValueChange={(value) => {
                setFontScale(value);
              }}
              onSlidingComplete={(value) => {
                const nextValue = Number(value.toFixed(2));
                setFontScale(nextValue);
                void patch((prev) => ({
                  ...prev,
                  accessibility: {
                    ...prev.accessibility,
                    textScale: nextValue,
                  },
                }));
              }}
              accessibilityLabel="Text size slider"
              accessibilityHint={getAccessibilityHint("Adjusts text size across the entire app")}
            />
          </GlassSurface>
        </View>
        <ToggleRow
          label="High Contrast Mode"
          value={highContrastMode}
          onValueChange={(value) =>
            {
              setHighContrastMode(value);
              void patch((prev) => ({
                ...prev,
                accessibility: { ...prev.accessibility, highContrastMode: value },
              }));
            }
          }
        />
        <ToggleRow
          label="Reduce Animations"
          value={reduceAnimations}
          onValueChange={(value) =>
            {
              setReduceAnimations(value);
              void patch((prev) => ({
                ...prev,
                accessibility: { ...prev.accessibility, reduceAnimations: value },
              }));
            }
          }
        />
        <ToggleRow
          label="Bold Text"
          value={boldText}
          onValueChange={(value) =>
            {
              setBoldText(value);
              void patch((prev) => ({
                ...prev,
                accessibility: { ...prev.accessibility, boldText: value },
              }));
            }
          }
        />
        <ToggleRow
          label="Screen Reader Hints"
          value={screenReaderHints}
          onValueChange={(value) =>
            {
              setScreenReaderHints(value);
              void patch((prev) => ({
                ...prev,
                accessibility: { ...prev.accessibility, screenReaderHints: value },
              }));
            }
          }
        />
        <ToggleRow
          label="One-Handed Mode"
          value={oneHandedMode}
          onValueChange={(value) => {
            setOneHandedMode(value);
            void patch((prev) => ({
              ...prev,
              accessibility: { ...prev.accessibility, oneHandedMode: value },
            }));
          }}
        />
        <ToggleRow
          label="Left-Handed Mode"
          value={leftHandedMode}
          onValueChange={(value) => {
            setLeftHandedMode(value);
            void patch((prev) => ({
              ...prev,
              accessibility: { ...prev.accessibility, leftHandedMode: value },
            }));
          }}
        />
        <ToggleRow
          label="Focus Mode (Practice-only)"
          value={focusMode}
          onValueChange={(value) => {
            setFocusMode(value);
            void patch((prev) => ({
              ...prev,
              accessibility: { ...prev.accessibility, focusMode: value },
            }));
          }}
        />
        <View>
          <Text
            style={{
              color: palette.colors.textSecondary,
              fontSize: scaleFont(12),
              fontWeight: getFontWeight("700"),
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 6,
            }}
          >
            Haptic Intensity
          </Text>
          <GlassSegmentedControl
            value={hapticIntensity}
            options={[
              { value: "off", label: "Off" },
              { value: "subtle", label: "Subtle" },
              { value: "full", label: "Full" },
            ]}
            onValueChange={(value) => {
              if (value === "off" || value === "subtle" || value === "full") {
                setHapticIntensityMode(value);
                void patch((prev) => ({
                  ...prev,
                  accessibility: { ...prev.accessibility, hapticIntensity: value },
                }));
              }
            }}
          />
        </View>
        <GlassDropdown
          label="Color Blind Mode"
          value={colorBlindMode}
          options={[
            { value: "none", label: "None", description: "Default color system" },
            {
              value: "deuteranopia",
              label: "Deuteranopia",
              description: "Red/green support",
            },
            {
              value: "protanopia",
              label: "Protanopia",
              description: "Alternative red/green support",
            },
            {
              value: "tritanopia",
              label: "Tritanopia",
              description: "Blue/yellow support",
            },
          ]}
          onValueChange={(value) => {
            if (
              value === "none" ||
              value === "deuteranopia" ||
              value === "protanopia" ||
              value === "tritanopia"
            ) {
              setColorBlindMode(value);
              void patch((prev) => ({
                ...prev,
                accessibility: { ...prev.accessibility, colorBlindMode: value },
              }));
            }
          }}
        />
      </SettingsSection>

      <SettingsSection
        id="appearance"
        title="Appearance"
        isOpen={openSection === "appearance"}
        onToggle={() => toggleSection("appearance")}
      >
        <Text
          style={{
            color: palette.colors.textSecondary,
            fontSize: scaleFont(12),
            fontWeight: getFontWeight("700"),
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Dark Themes
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {darkThemes.map((theme) => (
            <ThemeTile
              key={theme.name}
              theme={theme}
              active={themeName === theme.name}
              onPress={() => {
                void applyTheme(theme.name);
              }}
              labelColor={palette.colors.text}
              activeBorderColor={palette.colors.accent}
              activeDotColor={palette.colors.accentMuted}
            />
          ))}
        </View>

        <Text
          style={{
            color: palette.colors.textSecondary,
            fontSize: scaleFont(12),
            fontWeight: getFontWeight("700"),
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginTop: 4,
          }}
        >
          Light Themes
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {lightThemes.map((theme) => (
            <ThemeTile
              key={theme.name}
              theme={theme}
              active={themeName === theme.name}
              onPress={() => {
                void applyTheme(theme.name);
              }}
              labelColor={palette.colors.text}
              activeBorderColor={palette.colors.accent}
              activeDotColor={palette.colors.accentMuted}
            />
          ))}
        </View>
      </SettingsSection>

      <SettingsSection
        id="privacy"
        title="Privacy"
        isOpen={openSection === "privacy"}
        onToggle={() => toggleSection("privacy")}
      >
        <View>
          <Text
            style={{
              color: palette.colors.textSecondary,
              fontSize: scaleFont(12),
              fontWeight: getFontWeight("700"),
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 6,
            }}
          >
            Profile Visibility
          </Text>
          <GlassSegmentedControl
            value={settings.privacy.profileVisibility}
            options={[
              { value: "public", label: "Public" },
              { value: "school", label: "School" },
              { value: "private", label: "Private" },
            ]}
            onValueChange={(value) => {
              if (value === "school" || value === "public" || value === "private") {
                void patch((prev) => ({
                  ...prev,
                  privacy: { ...prev.privacy, profileVisibility: value },
                }));
              }
            }}
          />
        </View>
        <ToggleRow
          label="Show Online Status"
          value={settings.privacy.showOnlineStatus}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              privacy: { ...prev.privacy, showOnlineStatus: value },
            }))
          }
        />
        <ToggleRow
          label="Show Mood"
          value={settings.privacy.showMood}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              privacy: { ...prev.privacy, showMood: value },
            }))
          }
        />
        <ToggleRow
          label="Allow Friend Suggestions"
          value={settings.privacy.allowFriendSuggestions}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              privacy: { ...prev.privacy, allowFriendSuggestions: value },
            }))
          }
        />
        <Badge variant="gray-subtle" icon={<Ban />} capitalize={false}>
          Blocked Users: {settings.privacy.blockedUserIds.length}
        </Badge>
      </SettingsSection>

      <SettingsSection
        id="customize"
        title="Customize"
        isOpen={openSection === "customize"}
        onToggle={() => toggleSection("customize")}
      >
        <GlassButton
          variant="ghost"
          label="Open My Conferences"
          onPress={() => {
            hapticTap();
            navigation.navigate("MyConferences");
          }}
        />

        <ToggleRow
          label="Show Stories Bar"
          value={settings.customize.showStoriesBar}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              customize: { ...prev.customize, showStoriesBar: value },
            }))
          }
        />
        <ToggleRow
          label="Show Campus Pulse"
          value={settings.customize.showCampusPulse}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              customize: { ...prev.customize, showCampusPulse: value },
            }))
          }
        />
        <ToggleRow
          label="Show Social Feed"
          value={settings.customize.showSocialFeed}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              customize: { ...prev.customize, showSocialFeed: value },
            }))
          }
        />
      </SettingsSection>

      <SettingsSection
        id="about"
        title="About"
        isOpen={openSection === "about"}
        onToggle={() => toggleSection("about")}
      >
        <Text>App Version: {appVersion}</Text>
        <Text>
          FBLA Atlas is a high school social/campus platform built for FBLA competition with
          events, messaging, social feed, and Finn AI support.
        </Text>
        <GlassButton
          variant="ghost"
          label="Terms"
          onPress={() => {
            void Linking.openURL("https://fblaatlas.com/terms");
          }}
        />
        <GlassButton
          variant="ghost"
          label="Privacy Policy"
          onPress={() => {
            void Linking.openURL("https://fblaatlas.com/privacy");
          }}
        />
        <GlassButton
          variant="ghost"
          label="Rate the App"
          onPress={() => {
            void Linking.openURL("https://apps.apple.com");
            Alert.alert("Thanks", "Thank you for your support!");
          }}
        />
        <Text
          style={{
            color: palette.colors.textSecondary,
            fontWeight: getFontWeight("700"),
            fontSize: scaleFont(12),
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Feedback Type
        </Text>
        <GlassSegmentedControl
          value={feedbackType}
          onValueChange={setFeedbackType}
          options={[
            { label: "Bug", value: "bug_report" },
            { label: "Feature", value: "feature_request" },
            { label: "General", value: "general_feedback" },
            { label: "Design", value: "design_suggestion" },
          ]}
        />
        <GlassInput
          label="Feedback"
          value={feedback}
          onChangeText={setFeedback}
          multiline
          placeholder="Share what should improve."
          inputWrapperStyle={{ borderRadius: 18 }}
        />
        <GlassButton
          variant="solid"
          label={submittingFeedback ? "Sending..." : "Send Feedback"}
          disabled={!feedback.trim() || !profile}
          onPress={async () => {
            if (!profile || !feedback.trim()) {
              return;
            }
            hapticTap();
            setSubmittingFeedback(true);
            try {
              await addDoc(collection(db, "feedback"), {
                uid: profile.uid,
                schoolId: profile.schoolId,
                type: feedbackType,
                message: feedback.trim(),
                appVersion,
                deviceOS: Platform.OS,
                createdAt: serverTimestamp(),
              });
              setFeedback("");
              Alert.alert("Thanks", "Feedback sent.");
            } catch (error) {
              console.warn("Feedback submit failed:", error);
            } finally {
              setSubmittingFeedback(false);
            }
          }}
        />
      </SettingsSection>

      <View style={{ gap: 10, marginTop: 4, marginBottom: 8 }}>
        <GlassButton
          variant="ghost"
          label="Reset to Defaults"
          onPress={() => {
            Alert.alert("Reset Settings", "Restore all settings to defaults?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Reset",
                style: "destructive",
                onPress: () => {
                  void (async () => {
                    hapticTap();
                    await resetSettings();
                    const defaults = createDefaultSettings();
                    setFontScale(defaults.accessibility.textScale);
                    setHighContrastMode(defaults.accessibility.highContrastMode);
                    setReduceAnimations(defaults.accessibility.reduceAnimations);
                    setBoldText(defaults.accessibility.boldText);
                    setScreenReaderHints(defaults.accessibility.screenReaderHints);
                    setOneHandedMode(defaults.accessibility.oneHandedMode);
                    setLeftHandedMode(defaults.accessibility.leftHandedMode);
                    setHapticIntensityMode(defaults.accessibility.hapticIntensity);
                    setColorBlindMode(defaults.accessibility.colorBlindMode);
                    setFocusMode(defaults.accessibility.focusMode);
                  })();
                },
              },
            ]);
          }}
          style={{
            minHeight: 52,
            borderRadius: 999,
            backgroundColor: palette.colors.surfaceAlt,
            justifyContent: "center",
          }}
        />
        <GlassButton
          variant="ghost"
          label="Log Out"
          onPress={handleLogout}
          style={{
            minHeight: 52,
            borderRadius: 999,
            backgroundColor: palette.colors.surfaceAlt,
            justifyContent: "center",
          }}
        />
        <GlassButton
          variant="ghost"
          label="Delete Account"
          onPress={handleDeleteAccount}
          style={{
            minHeight: 52,
            borderRadius: 999,
            backgroundColor: palette.colors.surfaceAlt,
            justifyContent: "center",
          }}
          textStyle={{ color: palette.colors.error, fontWeight: getFontWeight("700") }}
        />
      </View>

      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: palette.colors.overlay,
            justifyContent: "center",
            paddingHorizontal: 16,
          }}
        >
          <GlassSurface style={{ padding: 14, borderRadius: 16, gap: 12 }}>
            <Text
              style={{
                color: palette.colors.text,
                fontWeight: getFontWeight("700"),
                fontSize: scaleFont(18),
              }}
            >
              Confirm Permanent Delete
            </Text>
            <Text style={{ color: palette.colors.textSecondary, fontSize: scaleFont(13) }}>
              Type DELETE to permanently remove your account and all data.
            </Text>
            <GlassInput
              label="Type DELETE"
              value={deleteConfirmInput}
              onChangeText={setDeleteConfirmInput}
              autoCapitalize="characters"
              placeholder="DELETE"
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <GlassButton
                variant="ghost"
                label="Cancel"
                onPress={() => {
                  setDeleteConfirmVisible(false);
                  setDeleteConfirmInput("");
                }}
                style={{ flex: 1 }}
              />
              <GlassButton
                variant="ghost"
                label="Delete Forever"
                onPress={() => {
                  if (deleteConfirmInput.trim().toUpperCase() !== "DELETE") {
                    Alert.alert("Delete Account", "Type DELETE exactly to continue.");
                    return;
                  }
                  setDeleteConfirmVisible(false);
                  setDeleteConfirmInput("");
                  performDeleteAccount();
                }}
                style={{
                  flex: 1,
                  backgroundColor: palette.colors.surfaceAlt,
                }}
                textStyle={{ color: palette.colors.error, fontWeight: getFontWeight("700") }}
              />
            </View>
          </GlassSurface>
        </View>
      </Modal>
    </ScreenShell>
  );
}

