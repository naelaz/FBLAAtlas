import { LinkingOptions, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useThemeContext } from "../context/ThemeContext";
import { AnnouncementDetailScreen } from "../screens/AnnouncementDetailScreen";
import { AdminDashboardScreen } from "../screens/AdminDashboardScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { CreatePostScreen } from "../screens/CreatePostScreen";
import { EventDetailScreen } from "../screens/EventDetailScreen";
import { FinnScreen } from "../screens/FinnScreen";
import { JoinChapterScreen } from "../screens/JoinChapterScreen";
import { LeaderboardScreen } from "../screens/LeaderboardScreen";
import { MyConferencesScreen } from "../screens/MyConferencesScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { PracticeEventHubScreen } from "../screens/PracticeEventHubScreen";
import { PracticeScreen } from "../screens/PracticeScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { StudentProfileScreen } from "../screens/StudentProfileScreen";
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
          Events: "events",
          Finn: "finn",
          Messages: "messages",
          Profile: "profile",
          SettingsTab: "settings-tab",
        },
      },
      AdminDashboard: "admin",
      Practice: "practice",
      PracticeEventHub: "practice/:eventId/:mode?",
      EventDetail: "events/:eventId",
      Notifications: "notifications",
      Leaderboard: "leaderboard",
      Settings: "settings",
      MyConferences: "conferences",
      JoinChapter: "join-chapter",
    },
  },
};

type RootNavigatorProps = {
  startInAdmin?: boolean;
};

export function RootNavigator({ startInAdmin = false }: RootNavigatorProps) {
  const { navigationTheme, palette } = useThemeContext();

  return (
    <NavigationContainer theme={navigationTheme} linking={linking}>
      <Stack.Navigator
        initialRouteName={startInAdmin ? "AdminDashboard" : "MainTabs"}
        screenOptions={{
          contentStyle: { backgroundColor: palette.colors.background },
          headerStyle: { backgroundColor: palette.colors.surface },
          headerShadowVisible: false,
          headerTintColor: palette.colors.text,
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: "800",
            color: palette.colors.text,
          },
          animation: "fade_from_bottom",
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
