import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { Camera, Check, ChevronDown, ChevronLeft, Shield, X } from "lucide-react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassSurface } from "../components/ui/GlassSurface";
import { storage } from "../config/firebase";
import { useAuthContext } from "../context/AuthContext";
import { useGamification } from "../context/GamificationContext";
import { useThemeContext } from "../context/ThemeContext";
import { DEFAULT_IMAGE_BLURHASH } from "../constants/media";
import { RootStackParamList } from "../navigation/types";
import { hapticTap } from "../services/haptics";
import { createPost } from "../services/socialService";

type Props = NativeStackScreenProps<RootStackParamList, "CreatePost">;

const MAX_CHARACTERS = 500;
const MAX_TAGS = 3;
const POST_TAGS = [
  "Events",
  "NLC",
  "SLC",
  "DLC",
  "Practice",
  "Study Group",
  "Business Law",
  "Accounting",
  "Marketing",
  "Public Speaking",
  "Entrepreneurship",
  "Technology",
  "Chapter News",
  "Officer Update",
  "Competition Prep",
  "Results",
  "Question",
  "Tips",
];

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error("Unable to read selected image.");
  }
  return await response.blob();
}

async function uploadPostImage(
  userId: string,
  localUri: string,
  onProgress: (progress: number) => void,
): Promise<string> {
  const filePath = `posts/${userId}/${Date.now()}.jpg`;
  const storageRef = ref(storage, filePath);
  const blob = await uriToBlob(localUri);

  return await new Promise<string>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob, { contentType: "image/jpeg" });
    task.on(
      "state_changed",
      (snapshot) => {
        const progress =
          snapshot.totalBytes > 0 ? snapshot.bytesTransferred / snapshot.totalBytes : 0;
        onProgress(progress);
      },
      reject,
      async () => {
        try {
          const downloadUrl = await getDownloadURL(task.snapshot.ref);
          onProgress(1);
          resolve(downloadUrl);
        } catch (error) {
          reject(error);
        }
      },
    );
  });
}

export function CreatePostScreen({ navigation }: Props) {
  const { profile, isGuest } = useAuthContext();
  const { handleAwardResult } = useGamification();
  const { palette } = useThemeContext();

  if (isGuest) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
          <Shield size={48} color={palette.colors.primary} />
          <Text style={{ color: palette.colors.text, fontWeight: "800", fontSize: 22, textAlign: "center" }}>
            Admin Access Required
          </Text>
          <Text style={{ color: palette.colors.textSecondary, textAlign: "center", fontSize: 15, lineHeight: 22 }}>
            Only chapter admins can post to the feed. Contact your chapter administrator for access.
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ backgroundColor: palette.colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, marginTop: 8 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const [text, setText] = useState("");
  const [inputHeight, setInputHeight] = useState(140);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagError, setTagError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const remaining = MAX_CHARACTERS - text.length;
  const canSubmit = Boolean(profile && (text.trim().length > 0 || selectedImageUri) && !submitting);

  const normalizedTags = useMemo(() => selectedTags.slice(0, MAX_TAGS), [selectedTags]);

  const onPickPhoto = async () => {
    hapticTap();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
      aspect: [16, 9],
    });
    if (result.canceled) {
      return;
    }
    const uri = result.assets?.[0]?.uri;
    if (uri) {
      setSelectedImageUri(uri);
      setUploadProgress(null);
    }
  };

  const toggleTag = (tag: string) => {
    setTagError(false);
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((item) => item !== tag);
      }
      if (prev.length >= MAX_TAGS) {
        setTagError(true);
        return prev;
      }
      return [...prev, tag];
    });
  };

  const submit = async () => {
    if (!profile || !canSubmit) {
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (selectedImageUri) {
        setUploadProgress(0);
        imageUrl = await uploadPostImage(profile.uid, selectedImageUri, setUploadProgress);
      }
      const result = await createPost(profile, text.trim(), imageUrl, normalizedTags);
      handleAwardResult(result);
      navigation.goBack();
    } catch (error) {
      console.warn("Create post submit failed:", error);
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  if (!profile) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 10,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ minWidth: 44, minHeight: 44, alignItems: "flex-start", justifyContent: "center" }}
          >
            <ChevronLeft size={20} color={palette.colors.text} />
          </Pressable>
          <Text style={{ color: palette.colors.text, fontSize: 22, fontWeight: "700" }}>New Post</Text>
          <Pressable
            onPress={() => {
              hapticTap();
              void submit();
            }}
            disabled={!canSubmit}
            style={{ minWidth: 44, minHeight: 44, alignItems: "flex-end", justifyContent: "center" }}
          >
            <Text
              style={{
                color: canSubmit ? palette.colors.accent : palette.colors.textFaint,
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              {submitting ? "..." : "Post"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <AvatarWithStatus
              uri={profile.avatarUrl}
              seed={profile.displayName}
              size={40}
              online={false}
              tier={profile.tier}
            />
            <Text style={{ color: palette.colors.text, fontSize: 16, fontWeight: "600" }}>
              {profile.displayName}
            </Text>
          </View>

          <GlassSurface
            style={{
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingTop: 12,
              paddingBottom: 8,
              backgroundColor: palette.colors.surface,
            }}
          >
            <TextInput
              multiline
              maxLength={MAX_CHARACTERS}
              placeholder="What's on your mind?"
              placeholderTextColor={palette.colors.textFaint}
              value={text}
              onChangeText={setText}
              onContentSizeChange={(event) => {
                const nextHeight = Math.min(280, Math.max(140, event.nativeEvent.contentSize.height + 12));
                setInputHeight(nextHeight);
              }}
              style={{
                minHeight: inputHeight,
                color: palette.colors.text,
                fontSize: 16,
                lineHeight: 22,
                textAlignVertical: "top",
              }}
            />
            <Text style={{ alignSelf: "flex-end", color: palette.colors.textMuted, fontSize: 12 }}>
              {remaining}
            </Text>
          </GlassSurface>

          {selectedImageUri ? (
            <View style={{ marginTop: 12 }}>
              <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: palette.colors.border }}>
                <Image
                  source={{ uri: selectedImageUri }}
                  style={{ width: "100%", aspectRatio: 16 / 9 }}
                  contentFit="cover"
                  placeholder={DEFAULT_IMAGE_BLURHASH}
                  transition={300}
                  cachePolicy="memory-disk"
                />
                <Pressable
                  onPress={() => {
                    hapticTap();
                    setSelectedImageUri(null);
                    setUploadProgress(null);
                  }}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    minHeight: 30,
                    minWidth: 30,
                    borderRadius: 999,
                    backgroundColor: palette.colors.surfaceAlt,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: palette.colors.border,
                  }}
                >
                  <X size={14} color={palette.colors.text} />
                </Pressable>
              </View>

              {typeof uploadProgress === "number" && uploadProgress >= 0 && uploadProgress < 1 ? (
                <View style={{ marginTop: 8 }}>
                  <View
                    style={{
                      width: "100%",
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: palette.colors.surfaceAlt,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.round(uploadProgress * 100)}%`,
                        height: 6,
                        backgroundColor: palette.colors.accent,
                      }}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          <GlassButton
            variant="ghost"
            label="Add Photo"
            icon={<Camera size={18} color={palette.colors.text} />}
            style={{ marginTop: 12 }}
            onPress={() => {
              void onPickPhoto();
            }}
          />

          <GlassSurface style={{ marginTop: 12, padding: 12, borderRadius: 16 }}>
            {normalizedTags.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {normalizedTags.map((tag) => (
                  <View
                    key={tag}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 999,
                      backgroundColor: palette.colors.accentMuted,
                      borderWidth: 1,
                      borderColor: palette.colors.accent,
                    }}
                  >
                    <Text style={{ color: palette.colors.text, fontSize: 12, fontWeight: "600" }}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              onPress={() => {
                hapticTap();
                setTagsExpanded((prev) => !prev);
              }}
              style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            >
              <Text style={{ color: palette.colors.text, fontSize: 15, fontWeight: "600" }}>
                Add Tags
              </Text>
              <ChevronDown
                size={18}
                color={palette.colors.textMuted}
                style={{ transform: [{ rotate: tagsExpanded ? "180deg" : "0deg" }] }}
              />
            </Pressable>

            {tagsExpanded ? (
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {POST_TAGS.map((tag) => {
                    const selected = normalizedTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        onPress={() => toggleTag(tag)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 999,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: selected ? palette.colors.accentMuted : palette.colors.surfaceAlt,
                          borderWidth: 1,
                          borderColor: selected ? palette.colors.accent : palette.colors.border,
                        }}
                      >
                        {selected ? <Check size={12} color={palette.colors.accent} /> : null}
                        <Text
                          style={{
                            color: selected ? palette.colors.accent : palette.colors.text,
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          {tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {tagError ? (
                  <Text style={{ marginTop: 8, color: palette.colors.warning, fontSize: 12 }}>Max 3 tags</Text>
                ) : null}
              </View>
            ) : null}
          </GlassSurface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
