import { LinearGradient } from "expo-linear-gradient";
import { Image, ImageContentFit } from "expo-image";
import React, { useEffect, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { DEFAULT_IMAGE_BLURHASH } from "../../constants/media";
import { useThemeContext } from "../../context/ThemeContext";

type AppImageProps = {
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  transition?: number;
  overlayReadable?: boolean;
  children?: React.ReactNode;
  accessibilityLabel?: string;
};

export function AppImage({
  uri,
  style,
  contentFit = "cover",
  transition = 300,
  overlayReadable = false,
  children,
  accessibilityLabel,
}: AppImageProps) {
  const { palette } = useThemeContext();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  return (
    <View
      style={[
        {
          overflow: "hidden",
          backgroundColor: palette.colors.surfaceSoft,
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          placeholder={DEFAULT_IMAGE_BLURHASH}
          transition={transition}
          cachePolicy="memory-disk"
          onError={() => setFailed(true)}
        />
      ) : (
        <LinearGradient
          colors={[palette.colors.primarySoft, palette.colors.secondarySoft]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {overlayReadable ? (
        <LinearGradient
          colors={[palette.colors.transparent, palette.colors.overlay]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}
