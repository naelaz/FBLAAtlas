import { ReactNode } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native-paper";

import { useNavBarVisibility } from "../context/NavBarVisibilityContext";
import { useThemeContext } from "../context/ThemeContext";
import { GlassSurface } from "./ui/GlassSurface";

type ScreenShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  headerAddon?: ReactNode;
};

export function ScreenShell({
  title,
  subtitle,
  children,
  refreshing = false,
  onRefresh,
  headerAddon,
}: ScreenShellProps) {
  const { reportScrollOffset, showNavBar } = useNavBarVisibility();
  const { palette } = useThemeContext();

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    reportScrollOffset(event.nativeEvent.contentOffset.y);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        onScrollBeginDrag={showNavBar}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.colors.primary}
              colors={[palette.colors.primary]}
              progressBackgroundColor={palette.colors.surface}
            />
          ) : undefined
        }
      >
        <GlassSurface
          style={{
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginBottom: 14,
            backgroundColor: palette.colors.glass,
            borderColor: palette.colors.glassBorder,
          }}
        >
          <View className="flex-row items-center justify-between gap-3">
            <View style={{ flex: 1 }}>
              <Text variant="headlineSmall" style={{ color: palette.colors.text, fontWeight: "700" }}>
                {title}
              </Text>
              {subtitle ? (
                <Text variant="bodyMedium" style={{ color: palette.colors.muted, marginTop: 4 }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {headerAddon}
          </View>
        </GlassSurface>

        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
