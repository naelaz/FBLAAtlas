import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { FloatingTabBar } from "../components/navigation/FloatingTabBar";
import { useAccessibility } from "../context/AccessibilityContext";
import { useThemeContext } from "../context/ThemeContext";
import { FinnScreen } from "../screens/FinnScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { MessagesScreen } from "../screens/MessagesScreen";
import { PracticeScreen } from "../screens/PracticeScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const { palette } = useThemeContext();
  const { focusMode } = useAccessibility();

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={() => ({
        animation: "shift",
        headerShown: false,
        sceneStyle: {
          backgroundColor: palette.colors.background,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: palette.colors.transparent,
          borderTopWidth: 0,
          elevation: 0,
        },
      })}
    >
      {focusMode ? null : (
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Home" }}
        />
      )}
      <Tab.Screen
        name="PracticeTab"
        component={PracticeScreen}
        options={{ title: "Practice" }}
      />
      <Tab.Screen name="Finn" component={FinnScreen} options={{ title: "Finn AI" }} />
      {focusMode ? null : (
        <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: "Messages" }} />
      )}
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: "Settings" }} />
    </Tab.Navigator>
  );
}
