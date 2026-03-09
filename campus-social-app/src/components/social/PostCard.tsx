import * as Clipboard from "expo-clipboard";
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
import { Text } from "react-native-paper";

import { useThemeContext } from "../../context/ThemeContext";
import { resolveAvatarUrl } from "../../constants/media";
import { formatDateTime } from "../../services/firestoreUtils";
import { hapticLike, hapticTap } from "../../services/haptics";
import { subscribePostComments } from "../../services/socialService";
import { CommentItem, PostItem, UserProfile } from "../../types/social";
import { formatCompactNumber, formatRelativeTime } from "../../utils/format";
import { AppImage } from "../media/AppImage";
import { Badge } from "../ui/badge";
import { AvatarWithStatus } from "../ui/AvatarWithStatus";
import { GlassButton } from "../ui/GlassButton";
import { GlassInput } from "../ui/GlassInput";
import { GlassSurface } from "../ui/GlassSurface";
import { TierBadge } from "../ui/TierBadge";

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
  const [heartPoint, setHeartPoint] = useState<{ x: number; y: number; id: string } | null>(null);
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
    // Animations removed in simplified mode.
  };

  const burstHeart = (x: number, y: number) => {
    const id = `${Date.now()}`;
    setHeartPoint({ x, y, id });
    setTimeout(() => {
      setHeartPoint((prev) => (prev?.id === id ? null : prev));
    }, 320);
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
              uri={resolveAvatarUrl(author?.avatarUrl, post.authorId)}
              size={36}
              online
              tier={author?.tier}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.colors.text, fontWeight: "800" }}>{post.authorName}</Text>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 1 }}>
                {author ? (
                  <TierBadge tier={author.tier} />
                ) : null}
                <Text style={{ color: palette.colors.muted, fontSize: 12 }}>{formatRelativeTime(post.createdAt)}</Text>
              </View>
            </View>
          </Pressable>
        </View>

        <Text variant="bodyLarge" style={{ marginTop: 10, color: palette.colors.text }}>
          {post.content}
        </Text>

        <Pressable
          onPress={(event) => {
            onImagePress(event.nativeEvent.locationX, event.nativeEvent.locationY);
          }}
          style={{ marginTop: 10, borderRadius: 12, overflow: "hidden" }}
        >
          <AppImage uri={post.imageUrl} style={{ width: "100%", aspectRatio: 4 / 3 }} />
          {heartPoint ? (
            <View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  left: heartPoint.x - 15,
                  top: heartPoint.y - 15,
                  opacity: 0.95,
                },
              ]}
            >
              <Text style={{ fontSize: 30 }}>❤️</Text>
            </View>
          ) : null}
        </Pressable>

        {reactionSummary.length > 0 ? (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {reactionSummary.slice(0, 4).map(([emoji, count]) => (
              <Badge key={emoji} size="sm" variant="gray-subtle" capitalize={false}>
                {emoji} {formatCompactNumber(count)}
              </Badge>
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
          <View>
            <GlassButton
              variant={likedByMe ? "solid" : "ghost"}
              label={likedByMe ? "Liked" : "Like"}
              fullWidth={false}
              onPress={() => {
                runLikeAnimation();
                hapticLike();
                void onToggleLike(post);
              }}
            />
          </View>

          <Text style={{ color: palette.colors.muted, fontSize: 12 }}>
            {formatCompactNumber(post.likeCount)} likes • {formatDateTime(post.createdAt)}
          </Text>
        </View>

        <Modal visible={commentsOpen} transparent animationType="slide" onRequestClose={() => setCommentsOpen(false)}>
          <View style={{ flex: 1, backgroundColor: palette.colors.overlay, justifyContent: "flex-end" }}>
            <Pressable style={{ flex: 1 }} onPress={() => setCommentsOpen(false)} />
            <View>
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
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={{ fontWeight: "800", color: palette.colors.text }}>
                              {comment.authorName}
                            </Text>
                            {comment.authorTier ? (
                              <TierBadge tier={comment.authorTier} />
                            ) : author && comment.authorId === author.uid ? (
                              <TierBadge tier={author.tier} />
                            ) : null}
                          </View>
                          <Text style={{ color: palette.colors.text, marginTop: 2 }}>{comment.content}</Text>
                          <Text style={{ color: palette.colors.muted, fontSize: 11, marginTop: 3 }}>
                            {formatRelativeTime(comment.createdAt)}
                          </Text>
                        </View>
                      ))
                    )}
                  </ScrollView>

                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 8 }}>
                    <GlassInput
                      placeholder="Reply..."
                      value={commentText}
                      onChangeText={setCommentText}
                      containerStyle={{ flex: 1 }}
                      inputWrapperStyle={{ minHeight: 42, borderRadius: 12 }}
                    />
                    <GlassButton
                      variant="solid"
                      label={pendingComment ? "Sending..." : "Send"}
                      fullWidth={false}
                      onPress={() => void submitComment()}
                      loading={pendingComment}
                      disabled={!commentText.trim() || pendingComment}
                    />
                  </View>
                </GlassSurface>
              </KeyboardAvoidingView>
            </View>
          </View>
        </Modal>

        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <Pressable
            style={{ flex: 1, backgroundColor: palette.colors.overlay, justifyContent: "flex-end" }}
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
