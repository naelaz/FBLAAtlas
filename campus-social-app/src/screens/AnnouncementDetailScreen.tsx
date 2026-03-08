import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { GlassSurface } from "../components/ui/GlassSurface";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "AnnouncementDetail">;

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

export function AnnouncementDetailScreen({ route, navigation }: Props) {
  const { item } = route.params;
  const { palette } = useThemeContext();

  return (
    <ScreenShell title="Announcement Detail" subtitle="Stack navigation example screen.">
      <View className="gap-3">
        <GlassSurface strong elevation={3} style={{ backgroundColor: palette.colors.surface, padding: 12 }}>
          <Text variant="titleLarge" style={{ color: palette.colors.text, fontWeight: "800" }}>
            {item.title}
          </Text>
          <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
            {item.author} • {formatDate(item.createdAt)}
          </Text>
          <Text style={{ color: palette.colors.text, marginTop: 10 }}>{item.body}</Text>
        </GlassSurface>

        <Pressable onPress={() => navigation.goBack()} style={{ minHeight: 44 }}>
          {({ pressed }) => (
            <GlassSurface
              pressed={pressed}
              elevation={2}
              borderRadius={12}
              style={{
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: palette.colors.text, fontWeight: "700" }}>Back</Text>
            </GlassSurface>
          )}
        </Pressable>
      </View>
    </ScreenShell>
  );
}
