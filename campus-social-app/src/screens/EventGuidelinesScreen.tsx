import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ChevronLeft, ExternalLink } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";

let WebView: React.ComponentType<any> | null = null;
if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
}

type Props = NativeStackScreenProps<RootStackParamList, "EventGuidelines">;

async function resolveS3Url(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const match = html.match(/window\.location\.href\s*=\s*"([^"]+)"/);
    if (match?.[1]) {
      return match[1].replace(/\\\//g, "/");
    }
    const hrefMatch = html.match(/href="(https:\/\/greektrack[^"]*\.pdf[^"]*)"/);
    if (hrefMatch?.[1]) {
      return hrefMatch[1].replace(/&amp;/g, "&");
    }
  } catch {
    // CORS will block this on web — expected
  }
  return "";
}

export function EventGuidelinesScreen({ route, navigation }: Props) {
  const { url, title } = route.params;
  const { palette } = useThemeContext();
  const webViewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    if (isWeb) {
      // On web, use the Firebase Cloud Function proxy to fetch the PDF
      // and serve it with Content-Type: application/pdf (bypasses CORS + X-Frame-Options).
      // The function URL follows the pattern: https://<region>-<project>.cloudfunctions.net/pdfProxy
      const proxyUrl = `https://us-central1-fbla-atlas-92661.cloudfunctions.net/pdfProxy?path=${encodeURIComponent(url)}`;
      setPdfUrl(proxyUrl);
      return;
    }

    // On native, no CORS — resolve the actual S3 PDF URL and use Google Docs viewer
    let cancelled = false;
    void (async () => {
      const directUrl = await resolveS3Url(url);
      if (cancelled) return;
      if (directUrl) {
        setPdfUrl(`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(directUrl)}`);
      } else {
        setPdfUrl(`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`);
      }
    })();
    return () => { cancelled = true; };
  }, [url, isWeb]);

  const handleOpenInBrowser = () => {
    void Linking.openURL(url);
  };

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
          onPress={handleOpenInBrowser}
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
            onPress={handleOpenInBrowser}
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
      ) : isWeb && pdfUrl ? (
        <iframe
          src={pdfUrl}
          style={{
            flex: 1,
            border: "none",
            width: "100%",
            height: "100%",
          }}
          allow="scripts"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
      ) : !isWeb && pdfUrl && WebView ? (
        <WebView
          ref={webViewRef}
          source={{ uri: pdfUrl }}
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
      ) : null}
    </SafeAreaView>
  );
}
