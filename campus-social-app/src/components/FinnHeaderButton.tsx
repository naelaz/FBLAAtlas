import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { Pressable } from "react-native";

import { RootStackParamList } from "../navigation/types";

export function FinnHeaderButton() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <Pressable
      onPress={() => navigation.navigate("Finn")}
      style={{ padding: 6, marginRight: 2 }}
      accessibilityRole="button"
      accessibilityLabel="Open Finn AI assistant"
    >
      <MaterialCommunityIcons name="robot-outline" size={24} color="#0F172A" />
    </Pressable>
  );
}

