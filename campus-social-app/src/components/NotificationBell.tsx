import { Feather } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { Text, View } from "react-native";

import { useNotifications } from "../context/NotificationsContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import { hapticTap } from "../services/haptics";
import { GlassIconButton } from "./ui/GlassIconButton";

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const { palette } = useThemeContext();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <View style={{ marginRight: 8 }}>
      <View>
        <GlassIconButton
          onPress={() => {
            hapticTap();
            navigation.navigate("Notifications");
          }}
          accessibilityLabel="Open notifications"
          size={38}
        >
          <Feather name="bell" size={20} color={palette.colors.text} />
        </GlassIconButton>
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
            <Text style={{ color: palette.colors.onDanger, fontSize: 10, fontWeight: "700" }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
