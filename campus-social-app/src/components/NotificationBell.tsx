import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NavigationProp } from "@react-navigation/native";
import { Pressable, Text, View } from "react-native";

import { RootStackParamList } from "../navigation/types";
import { useNotifications } from "../context/NotificationsContext";
import { useThemeContext } from "../context/ThemeContext";
import { hapticTap } from "../services/haptics";

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const { palette } = useThemeContext();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <Pressable
      onPress={() => {
        hapticTap();
        navigation.navigate("Notifications");
      }}
      style={{ padding: 6, marginRight: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Open notifications"
    >
      <View>
        <MaterialCommunityIcons name="bell-outline" size={24} color={palette.colors.text} />
        {unreadCount > 0 ? (
          <View
            style={{
              position: "absolute",
              top: -4,
              right: -8,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: palette.colors.danger,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
