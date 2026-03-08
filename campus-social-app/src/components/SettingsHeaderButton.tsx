import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { View } from "react-native";

import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import { GlassIconButton } from "./ui/GlassIconButton";

export function SettingsHeaderButton() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { palette } = useThemeContext();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 8 }}>
      <GlassIconButton
        onPress={() => navigation.navigate("Settings")}
        accessibilityLabel="Open settings"
        size={38}
      >
        <MaterialCommunityIcons name="cog-outline" size={20} color={palette.colors.text} />
      </GlassIconButton>
    </View>
  );
}
