import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";
import { StoryItem } from "../../types/social";

type StoryViewerProps = {
  story: StoryItem | null;
  onClose: () => void;
};

export function StoryViewerModal({ story, onClose }: StoryViewerProps) {
  const { palette } = useThemeContext();

  return (
    <Modal visible={story !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: palette.colors.overlay,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        {story ? (
          <View
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 18,
              backgroundColor: palette.colors.surface,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: palette.colors.border,
            }}
          >
            <View
              style={{
                backgroundColor: story.avatarColor,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: palette.colors.onPrimary, fontWeight: "700", fontSize: 16 }}>
                {story.userName}
              </Text>
            </View>
            <View style={{ padding: 16, gap: 16 }}>
              <Text style={{ color: palette.colors.text, fontSize: 18, fontWeight: "700" }}>
                {story.content}
              </Text>
              <Pressable
                onPress={onClose}
                style={{
                  alignSelf: "flex-start",
                  borderRadius: 12,
                  backgroundColor: palette.colors.primary,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: palette.colors.onPrimary, fontWeight: "700" }}>
                  Close Story
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
