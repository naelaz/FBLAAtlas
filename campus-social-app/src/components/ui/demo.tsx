import React from "react";
import { ScrollView, View } from "react-native";
import { Shield } from "lucide-react-native";
import { Text } from "react-native-paper";

import { Badge } from "./badge";

const VARIANTS = [
  "gray",
  "gray-subtle",
  "blue",
  "blue-subtle",
  "purple",
  "purple-subtle",
  "amber",
  "amber-subtle",
  "red",
  "red-subtle",
  "pink",
  "pink-subtle",
  "green",
  "green-subtle",
  "teal",
  "teal-subtle",
  "inverted",
  "trial",
  "turbo",
] as const;

export function BadgeDemo() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text variant="headlineSmall" style={{ fontWeight: "800" }}>
        Badge Variants
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {VARIANTS.map((variant) => (
          <Badge key={variant} variant={variant}>
            {variant}
          </Badge>
        ))}
      </View>

      <Text variant="headlineSmall" style={{ fontWeight: "800" }}>
        Badge Sizes
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Badge size="sm">small</Badge>
        <Badge size="md">medium</Badge>
        <Badge size="lg">large</Badge>
      </View>

      <Text variant="headlineSmall" style={{ fontWeight: "800" }}>
        With Icons
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Badge variant="blue" icon={<Shield />}>
          fbla
        </Badge>
        <Badge variant="green-subtle" size="sm" icon={<Shield />}>
          verified
        </Badge>
        <Badge variant="turbo" size="lg" icon={<Shield />}>
          pro
        </Badge>
      </View>
    </ScrollView>
  );
}
