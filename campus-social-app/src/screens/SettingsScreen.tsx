import Slider from "@react-native-community/slider";
import Constants from "expo-constants";
import { deleteUser, signOut } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Button, Card, Chip, SegmentedButtons, Switch, Text, TextInput } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { auth, db } from "../config/firebase";
import { useAuthContext } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { hapticTap } from "../services/haptics";
import { APP_THEMES } from "../theme/appThemes";

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function SettingsSection({ title, children }: SectionProps) {
  return (
    <Card mode="elevated" style={{ marginBottom: 12, backgroundColor: "#FFFFFF" }}>
      <Card.Content style={{ gap: 12 }}>
        <Text variant="titleMedium" style={{ fontWeight: "800" }}>
          {title}
        </Text>
        {children}
      </Card.Content>
    </Card>
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
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ flex: 1 }}>{label}</Text>
      <Switch
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
  const { profile } = useAuthContext();
  const { settings, updateSettings } = useSettings();
  const [feedback, setFeedback] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const appVersion = useMemo(() => {
    return Constants.expoConfig?.version ?? "1.0.0";
  }, []);

  const patch = async (updater: (prev: typeof settings) => typeof settings) => {
    try {
      await updateSettings(updater);
    } catch (error) {
      console.warn("Save settings failed:", error);
    }
  };

  return (
    <ScreenShell
      title="Settings"
      subtitle="Account, notifications, accessibility, appearance, privacy, and app info."
    >
      <SettingsSection title="Account">
        <Button mode="outlined">Edit Profile</Button>
        <Button mode="outlined">Change Email</Button>
        <Button mode="outlined">Change Password</Button>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip icon={settings.account.connectedGoogle ? "check" : "close"}>
            Google
          </Chip>
          <Chip icon={settings.account.connectedApple ? "check" : "close"}>
            Apple
          </Chip>
        </View>
        <Button
          mode="outlined"
          onPress={() => {
            hapticTap();
            void signOut(auth);
          }}
        >
          Logout
        </Button>
        <Button
          mode="outlined"
          textColor="#DC2626"
          onPress={() => {
            hapticTap();
            const user = auth.currentUser;
            if (!user) {
              return;
            }
            void deleteUser(user).catch((error) => {
              console.warn("Delete account failed:", error);
              Alert.alert("Delete Account", "Re-authentication may be required for this action.");
            });
          }}
        >
          Delete Account
        </Button>
      </SettingsSection>

      <SettingsSection title="Notifications">
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

      <SettingsSection title="Accessibility">
        <View>
          <Text style={{ marginBottom: 4 }}>Text Size ({settings.accessibility.textScale.toFixed(2)}x)</Text>
          <Slider
            value={settings.accessibility.textScale}
            minimumValue={0.85}
            maximumValue={1.3}
            step={0.05}
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

      <SettingsSection title="Appearance">
        <Text>Theme Picker</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {APP_THEMES.map((theme) => {
            const selected = settings.appearance.themeName === theme.name;
            return (
              <Pressable
                key={theme.name}
                onPress={() => {
                  hapticTap();
                  void patch((prev) => ({
                    ...prev,
                    appearance: { ...prev.appearance, themeName: theme.name },
                  }));
                }}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  borderWidth: selected ? 3 : 1,
                  borderColor: selected ? theme.colors.primary : "#CBD5E1",
                  overflow: "hidden",
                }}
              >
                <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
                <View style={{ height: 18, backgroundColor: theme.colors.primary }} />
              </Pressable>
            );
          })}
        </View>

        <SegmentedButtons
          value={settings.appearance.modeOverride}
          onValueChange={(value) => {
            if (value === "system" || value === "light" || value === "dark") {
              void patch((prev) => ({
                ...prev,
                appearance: {
                  ...prev.appearance,
                  modeOverride: value,
                },
              }));
            }
          }}
          buttons={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </SettingsSection>

      <SettingsSection title="Privacy">
        <SegmentedButtons
          value={settings.privacy.profileVisibility}
          onValueChange={(value) => {
            if (value === "school" || value === "friends" || value === "private") {
              void patch((prev) => ({
                ...prev,
                privacy: { ...prev.privacy, profileVisibility: value },
              }));
            }
          }}
          buttons={[
            { value: "school", label: "School" },
            { value: "friends", label: "Friends" },
            { value: "private", label: "Private" },
          ]}
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
        <Chip icon="block-helper">Blocked Users: {settings.privacy.blockedUserIds.length}</Chip>
      </SettingsSection>

      <SettingsSection title="About">
        <Text>App Version: {appVersion}</Text>
        <Text>
          FBLA Atlas is a high school social/campus platform built for FBLA competition with
          events, messaging, social feed, and Finn AI support.
        </Text>
        <Button mode="outlined">Terms</Button>
        <Button mode="outlined">Privacy Policy</Button>
        <Button mode="outlined">Rate the App</Button>
        <TextInput
          mode="outlined"
          label="Feedback"
          value={feedback}
          onChangeText={setFeedback}
          multiline
          placeholder="Share what should improve."
        />
        <Button
          mode="contained"
          loading={submittingFeedback}
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
                message: feedback.trim(),
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
        >
          Send Feedback
        </Button>
      </SettingsSection>
    </ScreenShell>
  );
}
