import { Facebook, Globe, Instagram, Music2, Youtube } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";

import { useAccessibility } from "../../context/AccessibilityContext";
import { useThemeContext } from "../../context/ThemeContext";
import { hapticTap } from "../../services/haptics";
import { formatRelativeDateTime } from "../../services/firestoreUtils";
import {
  fetchSocialFeedCards,
  SOCIAL_PLATFORM_META,
} from "../../services/socialContentService";
import { SocialFeedItem, SocialFeedPlatform } from "../../types/social";
import { GlassSurface } from "../ui/GlassSurface";

function PlatformIcon({ platform }: { platform: SocialFeedPlatform }) {
  const { palette } = useThemeContext();
  switch (platform) {
    case "instagram":
      return <Instagram size={18} color={SOCIAL_PLATFORM_META.instagram.color} />;
    case "facebook":
      return <Facebook size={18} color={SOCIAL_PLATFORM_META.facebook.color} />;
    case "youtube":
      return <Youtube size={18} color={SOCIAL_PLATFORM_META.youtube.color} />;
    case "tiktok":
      return <Music2 size={18} color={SOCIAL_PLATFORM_META.tiktok.color} />;
    case "x":
    default:
      return <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 15 }}>𝕏</Text>;
  }
}

async function openPlatformLink(platform: SocialFeedPlatform, fallbackUrl: string): Promise<void> {
  const appLinks: Record<SocialFeedPlatform, string> = {
    x: "twitter://user?screen_name=FBLA_National",
    instagram: "instagram://user?username=fbla_pbl",
    facebook: "fb://profile/171402746357725",
    youtube: "youtube://www.youtube.com/@FBLANational",
    tiktok: "snssdk1233://user/profile/6974628816454589446",
  };
  try {
    const appLink = appLinks[platform];
    if (await Linking.canOpenURL(appLink)) {
      await Linking.openURL(appLink);
      return;
    }
  } catch {
    // fall through to browser
  }
  await Linking.openURL(fallbackUrl);
}

function SocialCard({ item }: { item: SocialFeedItem }) {
  const { palette } = useThemeContext();
  const { scaleFont, getFontWeight, getAccessibilityHint } = useAccessibility();
  const meta = SOCIAL_PLATFORM_META[item.platform];
  const accentColor = item.platform === "x" ? palette.colors.text : meta.color;

  return (
    <GlassSurface
      style={{
        width: 170,
        minHeight: 208,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.colors.border,
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
        backgroundColor: palette.colors.surface,
        padding: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <PlatformIcon platform={item.platform} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: palette.colors.text, fontWeight: getFontWeight("700"), fontSize: scaleFont(13) }}>
            {meta.name}
          </Text>
          <Text style={{ color: palette.colors.textSecondary, fontSize: scaleFont(11) }}>
            {item.handle}
          </Text>
        </View>
      </View>

      <Text style={{ color: palette.colors.textSecondary, marginTop: 8, fontSize: scaleFont(12) }}>
        {meta.description}
      </Text>

      <GlassSurface
        style={{
          marginTop: 8,
          borderRadius: 12,
          padding: 8,
          backgroundColor: palette.colors.surfaceAlt,
        }}
      >
        <Text style={{ color: palette.colors.text, fontSize: scaleFont(12) }} numberOfLines={5}>
          {item.postText}
        </Text>
        {item.postDate ? (
          <Text style={{ color: palette.colors.textSecondary, marginTop: 6, fontSize: scaleFont(11) }}>
            Updated {formatRelativeDateTime(item.postDate)}
          </Text>
        ) : null}
      </GlassSurface>

      <Pressable
        onPress={() => {
          hapticTap();
          void openPlatformLink(item.platform, item.postUrl || meta.followUrl);
        }}
        style={{ marginTop: 10 }}
        accessibilityRole="button"
        accessibilityLabel={`Follow on ${meta.name}`}
        accessibilityHint={getAccessibilityHint(`Opens ${meta.name} profile`)}
      >
        {({ pressed }) => (
          <GlassSurface
            pressed={pressed}
            style={{
              minHeight: 36,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: palette.colors.inputSurface,
            }}
          >
            <Text style={{ color: palette.colors.text, fontWeight: getFontWeight("700"), fontSize: scaleFont(12) }}>
              Follow on {meta.name}
            </Text>
          </GlassSurface>
        )}
      </Pressable>
    </GlassSurface>
  );
}

export function FblaSocialSection() {
  const { palette } = useThemeContext();
  const { scaleFont, getFontWeight } = useAccessibility();
  const [items, setItems] = useState<SocialFeedItem[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const next = await fetchSocialFeedCards();
        if (mounted) {
          setItems(next);
        }
      } catch (error) {
        console.warn("Unable to load social feed cards:", error);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 6 }}>
        {items.map((item) => (
          <SocialCard key={item.platform} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}
