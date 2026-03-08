import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { StoryItem } from "../../types/social";

type StoryViewerProps = {
  story: StoryItem | null;
  onClose: () => void;
};

export function StoryViewerModal({ story, onClose }: StoryViewerProps) {
  return (
    <Modal visible={story !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(2,6,23,0.78)",
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
              backgroundColor: "#FFFFFF",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                backgroundColor: story.avatarColor,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
                {story.userName}
              </Text>
            </View>
            <View style={{ padding: 16, gap: 16 }}>
              <Text style={{ color: "#0F172A", fontSize: 18, fontWeight: "700" }}>
                {story.content}
              </Text>
              <Pressable
                onPress={onClose}
                style={{
                  alignSelf: "flex-start",
                  borderRadius: 12,
                  backgroundColor: "#0F172A",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>Close Story</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
