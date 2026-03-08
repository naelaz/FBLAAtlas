import { NavigationProp, ParamListBase, useNavigation, useRoute } from "@react-navigation/native";
import { ChevronLeft } from "lucide-react-native";
import { ReactNode } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, RefreshControl, ScrollView, View } from "react-native";
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
  breadcrumbItems?: string[];
  showBackButton?: boolean;
  onBackPress?: () => void;
};

export function ScreenShell({
  title,
  subtitle,
  children,
  refreshing = false,
  onRefresh,
  headerAddon,
  breadcrumbItems,
  showBackButton,
  onBackPress,
}: ScreenShellProps) {
  const { reportScrollOffset, showNavBar } = useNavBarVisibility();
  const { palette } = useThemeContext();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute();

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    reportScrollOffset(event.nativeEvent.contentOffset.y);
  };

  const computedBreadcrumb =
    breadcrumbItems ??
    (title.toLowerCase() === "home" ? ["Home"] : ["Home", title]);
  const canGoBack = navigation.canGoBack();
  const shouldShowBack =
    typeof showBackButton === "boolean"
      ? showBackButton
      : canGoBack || title.toLowerCase() !== "home";

  const goBackOrHome = () => {
    if (canGoBack) {
      navigation.goBack();
      return;
    }

    const parent = navigation.getParent();
    if (parent) {
      try {
        parent.navigate("Home" as never);
        return;
      } catch {
        // fall through
      }
    }

    try {
      navigation.navigate("Home" as never);
    } catch {
      // no-op fallback for routes that don't expose Home directly
    }
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
          strong
          elevation={3}
          intensity={palette.blur.lg}
        >
          <View className="flex-row items-center justify-between gap-3">
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 8 }}>
                {shouldShowBack ? (
                  <Pressable
                    onPress={() => {
                      if (onBackPress) {
                        onBackPress();
                        return;
                      }
                      goBackOrHome();
                    }}
                    style={{
                      minHeight: 44,
                      minWidth: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Back from ${route.name}`}
                  >
                    <ChevronLeft size={20} color={palette.colors.text} />
                  </Pressable>
                ) : null}
                <Text variant="labelMedium" style={{ color: palette.colors.textSecondary, fontWeight: "700" }}>
                  {computedBreadcrumb.join(" / ")}
                </Text>
              </View>
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
