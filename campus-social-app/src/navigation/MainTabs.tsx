import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View } from "react-native";

import { FloatingTabBar } from "../components/navigation/FloatingTabBar";
import { NotificationBell } from "../components/NotificationBell";
import { SettingsHeaderButton } from "../components/SettingsHeaderButton";
import { AppLogo } from "../components/branding/AppLogo";
import { useThemeContext } from "../context/ThemeContext";
import { EventsScreen } from "../screens/EventsScreen";
import { FinnScreen } from "../screens/FinnScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { MessagesScreen } from "../screens/MessagesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const { palette } = useThemeContext();

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={() => ({
        animation: "shift",
        headerStyle: { backgroundColor: palette.colors.surface },
        headerShadowVisible: false,
        headerTintColor: palette.colors.text,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: "800",
          color: palette.colors.text,
        },
        headerRightContainerStyle: { paddingRight: 6 },
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <NotificationBell />
            <SettingsHeaderButton />
          </View>
        ),
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitleAlign: "left",
          headerTitle: () => <AppLogo size={26} />,
        }}
      />
      <Tab.Screen name="Events" component={EventsScreen} options={{ title: "Events" }} />
      <Tab.Screen name="Finn" component={FinnScreen} options={{ title: "Finn AI" }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: "Messages" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}
