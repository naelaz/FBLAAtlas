import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassDropdown } from "../components/ui/GlassDropdown";
import { GlassInput } from "../components/ui/GlassInput";
import { useAuthContext } from "../context/AuthContext";
import { useGamification } from "../context/GamificationContext";
import { useThemeContext } from "../context/ThemeContext";
import { getSocialImage } from "../constants/media";
import { RootStackParamList } from "../navigation/types";
import { hapticTap } from "../services/haptics";
import { createPost } from "../services/socialService";

type Props = NativeStackScreenProps<RootStackParamList, "CreatePost">;

export function CreatePostScreen({ navigation }: Props) {
  const { profile } = useAuthContext();
  const { handleAwardResult } = useGamification();
  const { palette } = useThemeContext();

  const [text, setText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [schoolTag, setSchoolTag] = useState("");
  const [clubTag, setClubTag] = useState("");
  const [eventTag, setEventTag] = useState("");
  const [moodTag, setMoodTag] = useState("Focused");
  const [privacy, setPrivacy] = useState("school");
  const [submitting, setSubmitting] = useState(false);

  const create = async () => {
    if (!profile || !text.trim() || submitting) {
      return;
    }
    setSubmitting(true);
    try {
      const tags: string[] = [];
      if (schoolTag.trim()) tags.push(`#${schoolTag.trim().replace(/\s+/g, "")}`);
      if (clubTag.trim()) tags.push(`#${clubTag.trim().replace(/\s+/g, "")}`);
      if (eventTag.trim()) tags.push(`#${eventTag.trim().replace(/\s+/g, "")}`);
      if (moodTag.trim()) tags.push(`#mood-${moodTag.trim().replace(/\s+/g, "")}`);
      tags.push(`#privacy-${privacy}`);
      const withMeta = `${text.trim()}\n\n${tags.join(" ")}`;
      const result = await createPost(profile, withMeta, photoUrl.trim() || undefined);
      handleAwardResult(result);
      navigation.goBack();
    } catch (error) {
      console.warn("Create post screen submit failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenShell title="Create Post" subtitle="Share a school update with tags and optional image.">
      <View style={{ gap: 12 }}>
        <Text variant="headlineSmall" style={{ fontWeight: "900" }}>
          Create Post
        </Text>
        <Text style={{ color: palette.colors.textSecondary }}>
          Write an update, attach optional photo, and tag your school, club, event, and mood.
        </Text>

        <GlassInput
          label="Post text"
          multiline
          value={text}
          onChangeText={setText}
          placeholder="Share something with your campus..."
          inputWrapperStyle={{ borderRadius: 18 }}
        />
        <GlassInput
          label="Photo URL (optional)"
          value={photoUrl}
          onChangeText={setPhotoUrl}
          placeholder={getSocialImage("post-manual-placeholder")}
        />
        <GlassButton
          variant="ghost"
          label="Attach Placeholder Photo"
          onPress={() => {
            hapticTap();
            setPhotoUrl(getSocialImage(`post-attach-${Date.now()}`));
          }}
        />

        <View style={{ flexDirection: "row", gap: 8 }}>
          <GlassInput
            label="School tag"
            value={schoolTag}
            onChangeText={setSchoolTag}
            containerStyle={{ flex: 1 }}
          />
          <GlassInput
            label="Club tag"
            value={clubTag}
            onChangeText={setClubTag}
            containerStyle={{ flex: 1 }}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <GlassInput
            label="Event tag"
            value={eventTag}
            onChangeText={setEventTag}
            containerStyle={{ flex: 1 }}
          />
          <GlassInput
            label="Mood tag"
            value={moodTag}
            onChangeText={setMoodTag}
            containerStyle={{ flex: 1 }}
          />
        </View>

        <GlassDropdown
          label="Post Privacy"
          value={privacy}
          onValueChange={setPrivacy}
          options={[
            {
              value: "school",
              label: "School",
              description: "Visible to students in your school",
            },
            {
              value: "followers",
              label: "Followers",
              description: "Only followers can see this post",
            },
            {
              value: "private",
              label: "Private",
              description: "Only you can view this post",
            },
          ]}
        />

        <GlassButton
          variant="solid"
          label={submitting ? "Publishing..." : "Publish Post"}
          onPress={() => {
            hapticTap();
            void create();
          }}
          disabled={!text.trim()}
          loading={submitting}
        />
      </View>
    </ScreenShell>
  );
}
