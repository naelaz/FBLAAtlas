import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";

import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import { GlassIconButton } from "./ui/GlassIconButton";

export function FinnHeaderButton() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { palette } = useThemeContext();

  return (
    <GlassIconButton
      onPress={() => navigation.navigate("Finn")}
      accessibilityLabel="Open Finn AI assistant"
      size={38}
      style={{ marginRight: 2 }}
    >
      <MaterialCommunityIcons name="robot-outline" size={20} color={palette.colors.text} />
    </GlassIconButton>
  );
}
