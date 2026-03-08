import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { FloatingTabBar } from "../components/navigation/FloatingTabBar";
import { useThemeContext } from "../context/ThemeContext";
import { EventsScreen } from "../screens/EventsScreen";
import { FinnScreen } from "../screens/FinnScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { MessagesScreen } from "../screens/MessagesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const { palette } = useThemeContext();

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={() => ({
        animation: "shift",
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: palette.colors.transparent,
          borderTopWidth: 0,
          elevation: 0,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Home" }}
      />
      <Tab.Screen name="Events" component={EventsScreen} options={{ title: "Events" }} />
      <Tab.Screen name="Finn" component={FinnScreen} options={{ title: "Finn AI" }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: "Messages" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: "Settings" }} />
    </Tab.Navigator>
  );
}
