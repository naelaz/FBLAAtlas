import React, { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";
import { Facebook, Globe, Instagram, Music2, Youtube } from "lucide-react-native";
import { WebView } from "react-native-webview";

import { useAccessibility } from "../../context/AccessibilityContext";
import { useThemeContext } from "../../context/ThemeContext";
import { hapticTap } from "../../services/haptics";
import { GlassSurface } from "../ui/GlassSurface";

type PlatformId = "x" | "instagram" | "facebook" | "youtube" | "tiktok";

type SocialPlatform = {
  id: PlatformId;
  name: string;
  browserUrl: string;
  mobileWebUrl: string;
  appUrl: string;
  borderColor: string;
};

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: "x",
    name: "X",
    browserUrl: "https://twitter.com/FBLA_National",
    mobileWebUrl: "https://mobile.twitter.com/FBLA_National",
    appUrl: "twitter://user?screen_name=FBLA_National",
    borderColor: "#141414",
  },
  {
    id: "instagram",
    name: "Instagram",
    browserUrl: "https://www.instagram.com/fbla_pbl",
    mobileWebUrl: "https://www.instagram.com/fbla_pbl",
    appUrl: "instagram://user?username=fbla_pbl",
    borderColor: "#e1306c",
  },
  {
    id: "facebook",
    name: "Facebook",
    browserUrl: "https://www.facebook.com/FBLAnational",
    mobileWebUrl: "https://m.facebook.com/FBLAnational",
    appUrl: "fb://facewebmodal/f?href=https://www.facebook.com/FBLAnational",
    borderColor: "#1877f2",
  },
  {
    id: "youtube",
    name: "YouTube",
    browserUrl: "https://www.youtube.com/@FBLANational",
    mobileWebUrl: "https://m.youtube.com/@FBLANational",
    appUrl: "youtube://www.youtube.com/@FBLANational",
    borderColor: "#ff0000",
  },
  {
    id: "tiktok",
    name: "TikTok",
    browserUrl: "https://www.tiktok.com/@fbla_pbl",
    mobileWebUrl: "https://m.tiktok.com/@fbla_pbl",
    appUrl: "tiktok://user?username=fbla_pbl",
    borderColor: "#111111",
  },
];

function PlatformIcon({ id }: { id: PlatformId }) {
  switch (id) {
    case "instagram":
      return <Instagram size={18} color="#e1306c" />;
    case "facebook":
      return <Facebook size={18} color="#1877f2" />;
    case "youtube":
      return <Youtube size={18} color="#ff0000" />;
    case "tiktok":
      return <Music2 size={18} color="#f4f4f2" />;
    case "x":
    default:
      return (
        <Text style={{ color: "#f4f4f2", fontWeight: "900", fontSize: 16, lineHeight: 18 }}>X</Text>
      );
  }
}

function SocialPlatformCard({ platform }: { platform: SocialPlatform }) {
  const { palette } = useThemeContext();
  const { scaleFont, getFontWeight, getAccessibilityHint } = useAccessibility();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const openPlatform = useCallback(async () => {
    try {
      const canOpen = await Linking.canOpenURL(platform.appUrl);
      if (canOpen) {
        await Linking.openURL(platform.appUrl);
        return;
      }
    } catch {
      // Fall through to browser.
    }

    try {
      await Linking.openURL(platform.browserUrl);
    } catch (error) {
      console.warn(`Unable to open ${platform.name}:`, error);
    }
  }, [platform.appUrl, platform.browserUrl, platform.name]);

  return (
    <GlassSurface
      style={{
        width: 160,
        height: 200,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: platform.borderColor,
        backgroundColor: palette.colors.surface,
        overflow: "hidden",
        padding: 0,
      }}
    >
      <View
        style={{
          height: 44,
          paddingHorizontal: 10,
          borderBottomWidth: 1,
          borderBottomColor: palette.colors.divider,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
          <PlatformIcon id={platform.id} />
          <Text
            numberOfLines={1}
            style={{
              color: palette.colors.text,
              fontWeight: getFontWeight("700"),
              fontSize: scaleFont(12),
            }}
          >
            {platform.name}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            hapticTap();
            void openPlatform();
          }}
          style={{
            minHeight: 24,
            borderRadius: 999,
            paddingHorizontal: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: palette.colors.inputSurface,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Follow ${platform.name}`}
          accessibilityHint={getAccessibilityHint(`Opens ${platform.name} in app or browser`)}
        >
          <Text
            style={{
              color: palette.colors.text,
              fontWeight: getFontWeight("700"),
              fontSize: scaleFont(11),
            }}
          >
            Follow
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, backgroundColor: palette.colors.surfaceAlt }}>
        {!failed ? (
          <>
            <WebView
              source={{ uri: platform.mobileWebUrl }}
              style={{ flex: 1, backgroundColor: palette.colors.surfaceAlt }}
              scrollEnabled={false}
              bounces={false}
              pointerEvents="none"
              onLoadStart={() => {
                setLoading(true);
                setFailed(false);
              }}
              onError={() => {
                setFailed(true);
                setLoading(false);
              }}
              onLoadEnd={() => {
                setLoading(false);
              }}
              javaScriptEnabled
              domStorageEnabled
            />
            {loading ? (
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: palette.colors.surfaceAlt,
                }}
              >
                <ActivityIndicator size="small" color={palette.colors.primary} />
                <Text style={{ color: palette.colors.textSecondary, fontSize: scaleFont(11) }}>
                  Loading feed...
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 10,
              gap: 8,
            }}
          >
            <PlatformIcon id={platform.id} />
            <Text
              style={{
                color: palette.colors.text,
                fontWeight: getFontWeight("700"),
                fontSize: scaleFont(12),
                textAlign: "center",
              }}
            >
              {platform.name}
            </Text>
            <Pressable
              onPress={() => {
                hapticTap();
                void openPlatform();
              }}
              style={{
                minHeight: 28,
                borderRadius: 999,
                paddingHorizontal: 10,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: palette.colors.border,
                backgroundColor: palette.colors.inputSurface,
              }}
              accessibilityRole="button"
              accessibilityLabel={`Visit ${platform.name}`}
              accessibilityHint={getAccessibilityHint(`Opens ${platform.name} in browser`)}
            >
              <Text
                style={{
                  color: palette.colors.text,
                  fontWeight: getFontWeight("700"),
                  fontSize: scaleFont(11),
                }}
              >
                Tap to visit
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <View
        style={{
          height: 38,
          borderTopWidth: 1,
          borderTopColor: palette.colors.divider,
          paddingHorizontal: 8,
          justifyContent: "center",
        }}
      >
        <Pressable
          onPress={() => {
            hapticTap();
            void openPlatform();
          }}
          style={{
            minHeight: 28,
            borderRadius: 999,
            backgroundColor: palette.colors.inputSurface,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityRole="button"
          accessibilityLabel={`Open ${platform.name} in app`}
          accessibilityHint={getAccessibilityHint(`Opens ${platform.name} app, or browser if app is unavailable`)}
        >
          <Text
            style={{
              color: palette.colors.text,
              fontWeight: getFontWeight("700"),
              fontSize: scaleFont(11),
            }}
          >
            Open in app
          </Text>
        </Pressable>
      </View>
    </GlassSurface>
  );
}

export function FblaSocialSection() {
  const { palette } = useThemeContext();
  const { scaleFont, getFontWeight } = useAccessibility();

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Globe size={18} color={palette.colors.textMuted} />
        <Text
          style={{
            color: palette.colors.textMuted,
            fontWeight: getFontWeight("600"),
            fontSize: scaleFont(13),
            letterSpacing: 0.8,
            textTransform: "uppercase",
          }}
        >
          FBLA Social
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 6 }}
      >
        {SOCIAL_PLATFORMS.map((platform) => (
          <SocialPlatformCard key={platform.id} platform={platform} />
        ))}
      </ScrollView>
    </View>
  );
}
