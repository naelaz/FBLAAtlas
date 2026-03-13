import { NavigationProp, ParamListBase, useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft } from "lucide-react-native";
import { ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native-paper";

import { useAccessibility } from "../context/AccessibilityContext";
import { useSettings } from "../context/SettingsContext";
import { useThemeContext } from "../context/ThemeContext";
import { useNavBarScroll } from "../hooks/useNavBarScroll";
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
  /** Renders after the ScrollView, takes remaining flex space. Use for VirtualizedLists to avoid nesting. */
  fillContent?: ReactNode;
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
  fillContent,
}: ScreenShellProps) {
  const { onScroll, onScrollBeginDrag, scrollEventThrottle } = useNavBarScroll();
  const { palette } = useThemeContext();
  const {
    scaleFont,
    getFontWeight,
    getAccessibilityHint,
    focusMode,
    setFocusMode,
    leftHandedMode,
  } = useAccessibility();
  const { updateSettings } = useSettings();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute();

  const computedBreadcrumb =
    breadcrumbItems ??
    (title.toLowerCase() === "home" ? ["Home"] : ["Home", title]);
  const canGoBack = navigation.canGoBack();
  const shouldShowBack = typeof showBackButton === "boolean" ? showBackButton : canGoBack;

  const goBackOrHome = () => {
    if (canGoBack) {
      navigation.goBack();
      return;
    }

    try {
      (navigation as unknown as { navigate: (name: string, params?: Record<string, unknown>) => void }).navigate(
        "MainTabs",
        { screen: "Home" },
      );
    } catch {
      // no-op fallback for routes that don't expose Home directly
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.colors.background }}>
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: palette.colors.background }}>
      <LinearGradient
        pointerEvents="none"
        colors={
          palette.isDark
            ? [palette.colors.background, palette.colors.surfaceAlt]
            : [palette.colors.background, palette.colors.surface]
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <ScrollView
        style={{ flex: fillContent ? 0 : 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: fillContent ? 8 : 40 }}
        scrollEventThrottle={scrollEventThrottle}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBeginDrag}
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
            paddingHorizontal: 16,
            paddingVertical: 16,
            marginBottom: 12,
            backgroundColor: palette.colors.surface,
            borderColor: palette.colors.border,
            overflow: "hidden",
          }}
          elevation={2}
          intensity={palette.blur.lg}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[palette.colors.surface, palette.colors.transparent]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ position: "absolute", left: 0, right: 0, top: 0, height: 80 }}
          />
          <View
            style={{
              flexDirection: leftHandedMode ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
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
                    accessibilityHint={getAccessibilityHint("Returns to the previous screen")}
                  >
                    <ChevronLeft size={20} color={palette.colors.text} />
                  </Pressable>
                ) : null}
                <Text
                  variant="labelMedium"
                  style={{
                    color: palette.colors.textMuted,
                    fontWeight: getFontWeight("700"),
                    fontSize: scaleFont(11),
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {computedBreadcrumb.join(" / ")}
                </Text>
              </View>
              <Text
                variant="headlineSmall"
                style={{
                  color: palette.colors.text,
                  fontWeight: getFontWeight("700"),
                  fontSize: scaleFont(22),
                }}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  variant="bodyMedium"
                  style={{ color: palette.colors.textMuted, marginTop: 4, fontSize: scaleFont(14) }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {headerAddon}
          </View>
        </GlassSurface>

        {focusMode ? (
          <GlassSurface
            style={{
              marginBottom: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: palette.colors.surfaceAlt,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Text style={{ color: palette.colors.textSecondary, flex: 1 }}>
              Focus Mode is on
            </Text>
            <Pressable
              onPress={() => {
                setFocusMode(false);
                void updateSettings((prev) => ({
                  ...prev,
                  accessibility: { ...prev.accessibility, focusMode: false },
                }));
              }}
              accessibilityRole="button"
              accessibilityLabel="Disable focus mode"
              accessibilityHint={getAccessibilityHint("Shows social tabs and features again")}
              style={{ minHeight: 36, justifyContent: "center", paddingHorizontal: 8 }}
            >
              <Text style={{ color: palette.colors.primary, fontWeight: getFontWeight("700") }}>
                Disable
              </Text>
            </Pressable>
          </GlassSurface>
        ) : null}

        {children}
      </ScrollView>
      {fillContent ? <View style={{ flex: 1 }}>{fillContent}</View> : null}
    </SafeAreaView>
    </View>
  );
}
