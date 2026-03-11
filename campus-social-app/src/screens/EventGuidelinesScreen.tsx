import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ChevronLeft, ExternalLink } from "lucide-react-native";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "EventGuidelines">;

export function EventGuidelinesScreen({ route, navigation }: Props) {
  const { url, title } = route.params;
  const { palette } = useThemeContext();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const finalUrl = url.toLowerCase().endsWith(".pdf")
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`
    : url;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: palette.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: palette.colors.border,
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          hitSlop={12}
        >
          <ChevronLeft size={24} color={palette.colors.text} />
        </Pressable>
        <Text
          style={{ flex: 1, color: palette.colors.text, fontWeight: "700", fontSize: 16 }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Pressable
          onPress={() => void Linking.openURL(url)}
          accessibilityLabel="Open in browser"
          hitSlop={12}
        >
          <ExternalLink size={20} color={palette.colors.primary} />
        </Pressable>
      </View>

      {loading && !error ? (
        <View style={{ position: "absolute", top: "50%", left: "50%", transform: [{ translateX: -16 }, { translateY: -16 }], zIndex: 10 }}>
          <ActivityIndicator size="large" color={palette.colors.primary} />
        </View>
      ) : null}

      {error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
          <Text style={{ color: palette.colors.textSecondary, textAlign: "center", fontSize: 15 }}>
            Could not load the guidelines. Tap the button below to open them in your browser.
          </Text>
          <Pressable
            onPress={() => void Linking.openURL(url)}
            style={{
              backgroundColor: palette.colors.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Open in Browser</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: finalUrl }}
          style={{ flex: 1, backgroundColor: palette.colors.background }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          allowsInlineMediaPlayback
          javaScriptEnabled
          domStorageEnabled
        />
      )}
    </SafeAreaView>
  );
}
