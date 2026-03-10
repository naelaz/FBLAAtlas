import { LinkingOptions, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { View } from "react-native";

import { useThemeContext } from "../context/ThemeContext";
import { AnnouncementDetailScreen } from "../screens/AnnouncementDetailScreen";
import { AdminDashboardScreen } from "../screens/AdminDashboardScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { CreatePostScreen } from "../screens/CreatePostScreen";
import { EventDetailScreen } from "../screens/EventDetailScreen";
import { EventsScreen } from "../screens/EventsScreen";
import { FinnScreen } from "../screens/FinnScreen";
import { JoinChapterScreen } from "../screens/JoinChapterScreen";
import { LeaderboardScreen } from "../screens/LeaderboardScreen";
import { MyConferencesScreen } from "../screens/MyConferencesScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { PracticeEventHubScreen } from "../screens/PracticeEventHubScreen";
import { PracticeScreen } from "../screens/PracticeScreen";
import { ChallengeMembersScreen } from "../screens/ChallengeMembersScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { StudySessionScreen } from "../screens/StudySessionScreen";
import { StudentProfileScreen } from "../screens/StudentProfileScreen";
import { GlossaryScreen } from "../screens/GlossaryScreen";
import { OfficerTaskBoardScreen } from "../screens/OfficerTaskBoardScreen";
import { RoommateFinderScreen } from "../screens/RoommateFinderScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { MainTabs } from "./MainTabs";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["fbla://"],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: "home",
          PracticeTab: "practice-tab",
          Finn: "finn",
          Messages: "messages",
          SettingsTab: "settings-tab",
        },
      },
      AdminDashboard: "admin",
      Practice: "practice",
      PracticeEventHub: "practice/:eventId/:mode?",
      EventDetail: "events/:eventId",
      Events: "events",
      Profile: "profile",
      Notifications: "notifications",
      Leaderboard: "leaderboard",
      Settings: "settings",
      MyConferences: "conferences",
      JoinChapter: "join-chapter",
      ChallengeMembers: "challenges/:eventId",
      StudySession: "study-session/:sessionId",
      Glossary: "glossary",
      OfficerTasks: "officer-tasks",
      RoommateFinder: "roommate/:level",
      Search: "search",
    },
  },
};

type RootNavigatorProps = {
  startInAdmin?: boolean;
};

export function RootNavigator({ startInAdmin = false }: RootNavigatorProps) {
  const { navigationTheme, palette } = useThemeContext();
  const navTheme = useMemo(
    () => ({
      ...navigationTheme,
      dark: palette.isDark,
      colors: {
        ...navigationTheme.colors,
        primary: palette.colors.accent,
        background: palette.colors.background,
        card: palette.colors.background,
        text: palette.colors.text,
        border: palette.colors.border,
        notification: palette.colors.accent,
      },
    }),
    [navigationTheme, palette],
  );

  return (
    <NavigationContainer
      theme={navTheme}
      linking={linking}
      fallback={<View style={{ flex: 1, backgroundColor: palette.colors.background }} />}
    >
      <Stack.Navigator
        initialRouteName={startInAdmin ? "AdminDashboard" : "MainTabs"}
        screenOptions={{
          contentStyle: { backgroundColor: palette.colors.background },
          animation: "slide_from_right",
          headerStyle: { backgroundColor: palette.colors.surface },
          headerShadowVisible: false,
          headerTintColor: palette.colors.text,
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: "800",
            color: palette.colors.text,
          },
        }}
      >
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AnnouncementDetail"
          component={AnnouncementDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EventDetail"
          component={EventDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Events"
          component={EventsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Practice"
          component={PracticeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PracticeEventHub"
          component={PracticeEventHubScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Finn"
          component={FinnScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MyConferences"
          component={MyConferencesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreatePost"
          component={CreatePostScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="StudentProfile"
          component={StudentProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="JoinChapter"
          component={JoinChapterScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ChallengeMembers"
          component={ChallengeMembersScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="StudySession"
          component={StudySessionScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Glossary"
          component={GlossaryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OfficerTasks"
          component={OfficerTaskBoardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RoommateFinder"
          component={RoommateFinderScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
