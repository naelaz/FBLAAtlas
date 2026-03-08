import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useThemeContext } from "../context/ThemeContext";
import { AnnouncementDetailScreen } from "../screens/AnnouncementDetailScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { CreatePostScreen } from "../screens/CreatePostScreen";
import { EventDetailScreen } from "../screens/EventDetailScreen";
import { FinnScreen } from "../screens/FinnScreen";
import { LeaderboardScreen } from "../screens/LeaderboardScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { StudentProfileScreen } from "../screens/StudentProfileScreen";
import { MainTabs } from "./MainTabs";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { navigationTheme, palette } = useThemeContext();

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
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
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AnnouncementDetail"
          component={AnnouncementDetailScreen}
          options={{ title: "Announcement" }}
        />
        <Stack.Screen
          name="EventDetail"
          component={EventDetailScreen}
          options={{ title: "Event" }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: "Notifications" }}
        />
        <Stack.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{ title: "Leaderboard" }}
        />
        <Stack.Screen
          name="Finn"
          component={FinnScreen}
          options={{ title: "Finn AI" }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings" }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ title: "Chat" }}
        />
        <Stack.Screen
          name="CreatePost"
          component={CreatePostScreen}
          options={{ title: "Create Post" }}
        />
        <Stack.Screen
          name="StudentProfile"
          component={StudentProfileScreen}
          options={{ title: "Profile" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
