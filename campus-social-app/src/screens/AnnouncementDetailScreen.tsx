import { View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button, Card, Text } from "react-native-paper";

import { RootStackParamList } from "../navigation/types";
import { ScreenShell } from "../components/ScreenShell";

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

  return (
    <ScreenShell title="Announcement Detail" subtitle="Stack navigation example screen.">
      <View className="gap-3">
        <Card mode="elevated" style={{ backgroundColor: "#FFFFFF" }}>
          <Card.Title title={item.title} subtitle={`${item.author} • ${formatDate(item.createdAt)}`} />
          <Card.Content>
            <Text>{item.body}</Text>
          </Card.Content>
        </Card>
        <Button mode="outlined" onPress={() => navigation.goBack()}>
          Back
        </Button>
      </View>
    </ScreenShell>
  );
}

