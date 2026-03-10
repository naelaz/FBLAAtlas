import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassSurface } from "../components/ui/GlassSurface";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { usePermissions } from "../hooks/usePermissions";
import { RootStackParamList } from "../navigation/types";
import { moveOfficerTask, subscribeOfficerTasks } from "../services/officerTaskService";
import { OfficerTask } from "../types/features";

type Props = NativeStackScreenProps<RootStackParamList, "OfficerTasks">;

export function OfficerTaskBoardScreen({ navigation }: Props) {
  const { profile } = useAuthContext();
  const { palette } = useThemeContext();
  const permissions = usePermissions();
  const canManageTasks = permissions.canManageTasks();
  const [tasks, setTasks] = React.useState<OfficerTask[]>([]);

  React.useEffect(() => {
    if (!profile?.chapterId || !canManageTasks) {
      setTasks((prev) => (prev.length > 0 ? [] : prev));
      return;
    }
    const unsubscribe = subscribeOfficerTasks(profile.chapterId, setTasks);
    return unsubscribe;
  }, [canManageTasks, profile?.chapterId]);

  const grouped = useMemo(
    () => ({
      todo: tasks.filter((task) => task.status === "todo"),
      inProgress: tasks.filter((task) => task.status === "in_progress"),
      done: tasks.filter((task) => task.status === "done"),
    }),
    [tasks],
  );

  if (!canManageTasks) {
    return (
      <ScreenShell title="Officer Tasks" subtitle="Restricted" showBackButton onBackPress={() => navigation.goBack()}>
        <EmptyState title="No Permission" message="You don't have permission to access this board." />
      </ScreenShell>
    );
  }

  const renderColumn = (title: string, rows: OfficerTask[], nextStatus: OfficerTask["status"]) => (
    <View style={{ flex: 1, minWidth: 220 }}>
      <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>{title}</Text>
      {rows.length === 0 ? (
        <GlassSurface style={{ padding: 10 }}>
          <Text style={{ color: palette.colors.textSecondary }}>No tasks</Text>
        </GlassSurface>
      ) : (
        rows.map((task) => (
          <GlassSurface key={task.id} style={{ padding: 10, marginBottom: 8 }}>
            <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{task.title}</Text>
            <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
              {task.assigneeName} • Due {task.dueDate || "TBD"}
            </Text>
            <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
              Priority: {task.priority}
            </Text>
            <Pressable
              onPress={() => {
                void moveOfficerTask(task.id, nextStatus);
              }}
              style={{ marginTop: 8 }}
            >
              <GlassSurface style={{ minHeight: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                  Move to {nextStatus === "in_progress" ? "In Progress" : nextStatus === "done" ? "Done" : "To Do"}
                </Text>
              </GlassSurface>
            </Pressable>
          </GlassSurface>
        ))
      )}
    </View>
  );

  return (
    <ScreenShell
      title="Officer Task Board"
      subtitle="To Do, In Progress, Done"
      showBackButton
      onBackPress={() => navigation.goBack()}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {renderColumn("To Do", grouped.todo, "in_progress")}
        {renderColumn("In Progress", grouped.inProgress, "done")}
        {renderColumn("Done", grouped.done, "todo")}
      </ScrollView>
    </ScreenShell>
  );
}
