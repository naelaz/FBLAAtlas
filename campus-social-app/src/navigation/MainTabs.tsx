import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View } from "react-native";

import { FloatingTabBar } from "../components/navigation/FloatingTabBar";
import { NotificationBell } from "../components/NotificationBell";
import { SettingsHeaderButton } from "../components/SettingsHeaderButton";
import { useThemeContext } from "../context/ThemeContext";
import { EventsScreen } from "../screens/EventsScreen";
import { FinnScreen } from "../screens/FinnScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { MessagesScreen } from "../screens/MessagesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

function iconNameForRoute(routeName: keyof MainTabParamList): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (routeName) {
    case "Home":
      return "home-outline";
    case "Events":
      return "calendar-month-outline";
    case "Messages":
      return "message-text-outline";
    case "Profile":
      return "account-outline";
    default:
      return "circle-outline";
  }
}

export function MainTabs() {
  const { palette } = useThemeContext();

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({
        animation: "shift",
        headerStyle: { backgroundColor: palette.colors.surface },
        headerShadowVisible: false,
        headerTintColor: palette.colors.text,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: "800",
          color: palette.colors.text,
        },
        headerRight: () => <NotificationBell />,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons
            name={iconNameForRoute(route.name)}
            color={color}
            size={size}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Events" component={EventsScreen} />
      <Tab.Screen name="Finn" component={FinnScreen} options={{ title: "Finn" }} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <NotificationBell />
              <SettingsHeaderButton />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
