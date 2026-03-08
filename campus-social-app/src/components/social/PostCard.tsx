import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Button, Chip, Text, TextInput } from "react-native-paper";

import { useThemeContext } from "../../context/ThemeContext";
import { formatDateTime } from "../../services/firestoreUtils";
import { hapticLike, hapticTap } from "../../services/haptics";
import { subscribePostComments } from "../../services/socialService";
import { CommentItem, PostItem, UserProfile } from "../../types/social";
import { formatCompactNumber, formatRelativeTime } from "../../utils/format";
import { AvatarWithStatus } from "../ui/AvatarWithStatus";
import { GlassSurface } from "../ui/GlassSurface";

const REACTIONS = ["🔥", "👏", "💡", "🎯", "😂"];

type PostCardProps = {
  post: PostItem;
  currentUser: UserProfile;
  author?: UserProfile;
  onToggleLike: (post: PostItem) => Promise<void>;
  onReact: (post: PostItem, emoji: string) => Promise<void>;
  onAddComment: (post: PostItem, text: string) => Promise<void>;
  onPressAuthor?: (uid: string) => void;
};

function PostCardInner({
  post,
  currentUser,
  author,
  onToggleLike,
  onReact,
  onAddComment,
  onPressAuthor,
}: PostCardProps) {
  const { palette } = useThemeContext();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [pendingComment, setPendingComment] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [heartPoint, setHeartPoint] = useState<{ x: number; y: number } | null>(null);

  const likeScale = useSharedValue(1);
  const sheetTranslate = useSharedValue(420);
  const sheetOpacity = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartScale = useSharedValue(0.5);
  const heartTranslateY = useSharedValue(0);
  const lastTapRef = useRef(0);

  useEffect(() => {
    const unsubscribe = subscribePostComments(
      post.id,
      setComments,
      (error) => {
        console.warn("Comments subscription failed:", error);
      },
    );
    return unsubscribe;
  }, [post.id]);

  useEffect(() => {
    if (!commentsOpen) {
      sheetTranslate.value = withTiming(420, { duration: 260 });
      sheetOpacity.value = withTiming(0, { duration: 180 });
      return;
    }

    sheetTranslate.value = withSpring(0, { damping: 16, stiffness: 170 });
    sheetOpacity.value = withTiming(1, { duration: 220 });
  }, [commentsOpen, sheetOpacity, sheetTranslate]);

  const likeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslate.value }],
    opacity: sheetOpacity.value,
  }));

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }, { translateY: heartTranslateY.value }],
  }));

  const likedByMe = post.likedBy.includes(currentUser.uid);
  const myReaction = post.userReactions[currentUser.uid] ?? null;

  const reactionSummary = useMemo(() => {
    return Object.entries(post.reactionCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [post.reactionCounts]);

  const submitComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || pendingComment) {
      return;
    }
    setPendingComment(true);
    try {
      await onAddComment(post, trimmed);
      setCommentText("");
    } catch (error) {
      console.warn("Add comment failed:", error);
    } finally {
      setPendingComment(false);
    }
  };

  const runLikeAnimation = () => {
    likeScale.value = withSequence(
      withTiming(1.18, { duration: 110 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
  };

  const burstHeart = (x: number, y: number) => {
    setHeartPoint({ x, y });
    heartOpacity.value = 1;
    heartScale.value = 0.5;
    heartTranslateY.value = 0;
    heartScale.value = withSpring(1.2, { damping: 10, stiffness: 180 });
    heartTranslateY.value = withTiming(-26, { duration: 420 });
    heartOpacity.value = withTiming(0, { duration: 420 }, (finished) => {
      if (finished) {
        runOnJS(setHeartPoint)(null);
      }
    });
  };

  const onImagePress = (x: number, y: number) => {
    const now = Date.now();
    if (now - lastTapRef.current < 260) {
      hapticLike();
      runLikeAnimation();
      burstHeart(x, y);
      void onToggleLike(post);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  };

  const openComments = () => {
    hapticTap();
    setCommentsOpen(true);
  };

  return (
    <Pressable
      onLongPress={() => {
        hapticTap();
        setMenuOpen(true);
      }}
      delayLongPress={320}
    >
      <GlassSurface
        style={{
          marginBottom: 12,
          backgroundColor: palette.colors.glass,
          borderColor: palette.colors.glassBorder,
          borderRadius: 16,
          padding: 12,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={() => {
              if (onPressAuthor) {
                onPressAuthor(post.authorId);
              }
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
          >
            <AvatarWithStatus
              uri={author?.avatarUrl ?? `https://i.pravatar.cc/150?img=${(post.authorId.length % 70) + 1}`}
              size={36}
              online
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.colors.text, fontWeight: "800" }}>{post.authorName}</Text>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 1 }}>
                {author ? <Chip compact>{author.tier}</Chip> : null}
                <Text style={{ color: palette.colors.muted, fontSize: 12 }}>{formatRelativeTime(post.createdAt)}</Text>
              </View>
            </View>
          </Pressable>
        </View>

        <Text variant="bodyLarge" style={{ marginTop: 10, color: palette.colors.text }}>
          {post.content}
        </Text>

        {post.imageUrl ? (
          <Pressable
            onPress={(event) => {
              onImagePress(event.nativeEvent.locationX, event.nativeEvent.locationY);
            }}
            style={{ marginTop: 10, borderRadius: 14, overflow: "hidden" }}
          >
            <Image source={post.imageUrl} style={{ width: "100%", height: 190 }} contentFit="cover" transition={180} />
            {heartPoint ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: "absolute",
                    left: heartPoint.x - 15,
                    top: heartPoint.y - 15,
                  },
                  heartStyle,
                ]}
              >
                <Text style={{ fontSize: 30 }}>❤️</Text>
              </Animated.View>
            ) : null}
          </Pressable>
        ) : null}

        {reactionSummary.length > 0 ? (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {reactionSummary.slice(0, 4).map(([emoji, count]) => (
              <Chip key={emoji} compact>
                {emoji} {formatCompactNumber(count)}
              </Chip>
            ))}
          </View>
        ) : null}

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  hapticTap();
                  void onReact(post, emoji);
                }}
                style={{
                  borderWidth: 1,
                  borderColor: myReaction === emoji ? palette.colors.primary : palette.colors.border,
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  backgroundColor: myReaction === emoji ? palette.colors.cardTint : palette.colors.surface,
                  minWidth: 36,
                  minHeight: 36,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable onPress={openComments} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Text style={{ color: palette.colors.text, fontWeight: "700" }}>💬</Text>
              <Text style={{ color: palette.colors.text }}>{formatCompactNumber(post.commentCount)}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                hapticTap();
                void Share.share({ message: `${post.authorName} on FBLA Atlas:\n\n${post.content}` });
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
            >
              <Text style={{ color: palette.colors.text, fontWeight: "700" }}>↗</Text>
              <Text style={{ color: palette.colors.text }}>Share</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Animated.View style={likeStyle}>
            <Button
              mode={likedByMe ? "contained" : "outlined"}
              onPress={() => {
                runLikeAnimation();
                hapticLike();
                void onToggleLike(post);
              }}
            >
              {likedByMe ? "Liked" : "Like"}
            </Button>
          </Animated.View>

          <Text style={{ color: palette.colors.muted, fontSize: 12 }}>
            {formatCompactNumber(post.likeCount)} likes • {formatDateTime(post.createdAt)}
          </Text>
        </View>

        <Modal visible={commentsOpen} transparent animationType="none" onRequestClose={() => setCommentsOpen(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "flex-end" }}>
            <Pressable style={{ flex: 1 }} onPress={() => setCommentsOpen(false)} />
            <Animated.View style={sheetStyle}>
              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <GlassSurface
                  style={{
                    minHeight: 320,
                    maxHeight: "82%",
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    padding: 12,
                    backgroundColor: palette.colors.surface,
                    borderColor: palette.colors.glassBorder,
                  }}
                >
                  <View style={{ alignItems: "center", marginBottom: 8 }}>
                    <View style={{ width: 42, height: 4, borderRadius: 4, backgroundColor: palette.colors.border }} />
                  </View>
                  <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8, color: palette.colors.text }}>
                    Comments
                  </Text>

                  <ScrollView
                    style={{ maxHeight: 260 }}
                    contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {comments.length === 0 ? (
                      <Text style={{ color: palette.colors.muted }}>No comments yet. Start the thread.</Text>
                    ) : (
                      comments.map((comment, index) => (
                        <View
                          key={comment.id}
                          style={{
                            padding: 10,
                            borderRadius: 12,
                            backgroundColor: index % 2 === 0 ? palette.colors.surfaceSoft : palette.colors.cardTint,
                            marginLeft: index % 3 === 0 ? 0 : 10,
                          }}
                        >
                          <Text style={{ fontWeight: "800", color: palette.colors.text }}>{comment.authorName}</Text>
                          <Text style={{ color: palette.colors.text, marginTop: 2 }}>{comment.content}</Text>
                          <Text style={{ color: palette.colors.muted, fontSize: 11, marginTop: 3 }}>
                            {formatRelativeTime(comment.createdAt)}
                          </Text>
                        </View>
                      ))
                    )}
                  </ScrollView>

                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 8 }}>
                    <TextInput
                      mode="outlined"
                      placeholder="Reply..."
                      value={commentText}
                      onChangeText={setCommentText}
                      style={{ flex: 1 }}
                    />
                    <Button
                      mode="contained"
                      onPress={() => void submitComment()}
                      loading={pendingComment}
                      disabled={!commentText.trim() || pendingComment}
                    >
                      Send
                    </Button>
                  </View>
                </GlassSurface>
              </KeyboardAvoidingView>
            </Animated.View>
          </View>
        </Modal>

        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.42)", justifyContent: "flex-end" }}
            onPress={() => setMenuOpen(false)}
          >
            <Pressable>
              <GlassSurface
                style={{
                  margin: 12,
                  borderRadius: 16,
                  padding: 10,
                  backgroundColor: palette.colors.surface,
                  borderColor: palette.colors.glassBorder,
                }}
              >
                {[
                  {
                    label: "Copy",
                    onPress: async () => {
                      await Clipboard.setStringAsync(post.content);
                    },
                  },
                  {
                    label: "Share",
                    onPress: async () => {
                      await Share.share({ message: `${post.authorName}: ${post.content}` });
                    },
                  },
                  {
                    label: "Report",
                    onPress: async () => Promise.resolve(),
                  },
                  {
                    label: "Mute User",
                    onPress: async () => Promise.resolve(),
                  },
                ].map((action) => (
                  <Pressable
                    key={action.label}
                    onPress={() => {
                      hapticTap();
                      void action.onPress();
                      setMenuOpen(false);
                    }}
                    style={{
                      minHeight: 44,
                      borderRadius: 10,
                      justifyContent: "center",
                      paddingHorizontal: 10,
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: action.label === "Report" ? palette.colors.danger : palette.colors.text,
                        fontWeight: "700",
                      }}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </GlassSurface>
            </Pressable>
          </Pressable>
        </Modal>
      </GlassSurface>
    </Pressable>
  );
}

export const PostCard = React.memo(PostCardInner);
