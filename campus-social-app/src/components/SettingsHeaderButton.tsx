import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { Pressable, View } from "react-native";

import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";

export function SettingsHeaderButton() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { palette } = useThemeContext();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 8 }}>
      <Pressable
        onPress={() => navigation.navigate("Settings")}
        style={{ padding: 6 }}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
      >
        <MaterialCommunityIcons name="cog-outline" size={24} color={palette.colors.text} />
      </Pressable>
    </View>
  );
}

