import Slider from "@react-native-community/slider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { CommonActions, NavigationProp, useNavigation, useRoute } from "@react-navigation/native";
import { deleteUser } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Ban, Check, ChevronDown, CircleX } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Alert, LayoutAnimation, Platform, Pressable, UIManager, View } from "react-native";
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
import { useAuthContext } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useThemeContext } from "../context/ThemeContext";
import { hapticTap } from "../services/haptics";
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
          fontSize: 12,
          marginTop: 6,
          textAlign: "center",
          fontWeight: active ? "700" : "500",
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
  const progress = useSharedValue(isOpen ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(isOpen ? 1 : 0, { duration: 250 });
  }, [isOpen, progress]);

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
      >
        <Text
          style={{
            color: palette.colors.text,
            fontSize: 16,
            fontWeight: "700",
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
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { palette } = useThemeContext();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ flex: 1, color: palette.colors.text }}>{label}</Text>
      <GlassToggle
        value={value}
        onValueChange={(next) => {
          hapticTap();
          onValueChange(next);
        }}
      />
    </View>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { profile, signOutUser, setAdminMode } = useAuthContext();
  const { settings, updateSettings } = useSettings();
  const { palette, themeName, availableThemes, setThemeName } = useThemeContext();
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("bug_report");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  React.useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSection((prev) => (prev === sectionId ? null : sectionId));
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

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: () => {
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
        <GlassButton variant="ghost" label="Edit Profile" />
        <GlassButton variant="ghost" label="Change Email" />
        <GlassButton variant="ghost" label="Change Password" />
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
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              notifications: { ...prev.notifications, globalPush: value },
            }))
          }
        />
        <ToggleRow
          label="Likes"
          value={settings.notifications.likes}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              notifications: { ...prev.notifications, likes: value },
            }))
          }
        />
        <ToggleRow
          label="Comments"
          value={settings.notifications.comments}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              notifications: { ...prev.notifications, comments: value },
            }))
          }
        />
        <ToggleRow
          label="Follows"
          value={settings.notifications.follows}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              notifications: { ...prev.notifications, follows: value },
            }))
          }
        />
        <ToggleRow
          label="Events"
          value={settings.notifications.events}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              notifications: { ...prev.notifications, events: value },
            }))
          }
        />
        <ToggleRow
          label="XP"
          value={settings.notifications.xp}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              notifications: { ...prev.notifications, xp: value },
            }))
          }
        />
        <ToggleRow
          label="Streaks"
          value={settings.notifications.streaks}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              notifications: { ...prev.notifications, streaks: value },
            }))
          }
        />
        <ToggleRow
          label="News"
          value={settings.notifications.news}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              notifications: { ...prev.notifications, news: value },
            }))
          }
        />
        <ToggleRow
          label="Sound"
          value={settings.notifications.sound}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              notifications: { ...prev.notifications, sound: value },
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
          <Text style={{ marginBottom: 4 }}>Text Size ({settings.accessibility.textScale.toFixed(2)}x)</Text>
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
              value={settings.accessibility.textScale}
              minimumValue={0.85}
              maximumValue={1.3}
              step={0.05}
              minimumTrackTintColor={palette.colors.primary}
              maximumTrackTintColor={palette.colors.inputMuted}
              thumbTintColor={palette.colors.primary}
              onSlidingComplete={(value) => {
                void patch((prev) => ({
                  ...prev,
                  accessibility: {
                    ...prev.accessibility,
                    textScale: Number(value.toFixed(2)),
                  },
                }));
              }}
            />
          </GlassSurface>
        </View>
        <ToggleRow
          label="High Contrast Mode"
          value={settings.accessibility.highContrastMode}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              accessibility: { ...prev.accessibility, highContrastMode: value },
            }))
          }
        />
        <ToggleRow
          label="Reduce Animations"
          value={settings.accessibility.reduceAnimations}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              accessibility: { ...prev.accessibility, reduceAnimations: value },
            }))
          }
        />
        <ToggleRow
          label="Bold Text"
          value={settings.accessibility.boldText}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              accessibility: { ...prev.accessibility, boldText: value },
            }))
          }
        />
        <ToggleRow
          label="Screen Reader Hints"
          value={settings.accessibility.screenReaderHints}
          onValueChange={(value) =>
            void patch((prev) => ({
              ...prev,
              accessibility: { ...prev.accessibility, screenReaderHints: value },
            }))
          }
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
            fontSize: 12,
            fontWeight: "700",
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
            fontSize: 12,
            fontWeight: "700",
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
        <GlassDropdown
          label="Profile Visibility"
          value={settings.privacy.profileVisibility}
          options={[
            { value: "school", label: "School", description: "Visible within your school" },
            { value: "friends", label: "Friends", description: "Only approved friends" },
            { value: "private", label: "Private", description: "Only you can view" },
          ]}
          onValueChange={(value) => {
            if (value === "school" || value === "friends" || value === "private") {
              void patch((prev) => ({
                ...prev,
                privacy: { ...prev.privacy, profileVisibility: value },
              }));
            }
          }}
        />
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
            void WebBrowser.openBrowserAsync("https://www.fbla.org/legal/");
          }}
        />
        <GlassButton
          variant="ghost"
          label="Privacy Policy"
          onPress={() => {
            void WebBrowser.openBrowserAsync("https://www.fbla.org/privacy-policy/");
          }}
        />
        <GlassButton
          variant="ghost"
          label="Rate the App"
        />
        <Text style={{ color: palette.colors.textSecondary, fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>
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
          textStyle={{ color: palette.colors.error, fontWeight: "700" }}
        />
      </View>
    </ScreenShell>
  );
}

