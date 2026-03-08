import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Linking, Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { ActivityIndicator, Avatar, Button, Chip, SegmentedButtons, Text, TextInput } from "react-native-paper";

import { PostCard } from "../components/social/PostCard";
import { StoryViewerModal } from "../components/social/StoryViewerModal";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassSurface } from "../components/ui/GlassSurface";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { useAuthContext } from "../context/AuthContext";
import { useGamification } from "../context/GamificationContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import {
  addCommentToPost,
  fetchActivitiesOnce,
  fetchAnnouncements,
  fetchPostsOnce,
  fetchSchoolNewsOnce,
  fetchSchoolUsersOnce,
  fetchStoriesOnce,
  getSuggestedFriends,
  getTrendingPosts,
  setMoodForUser,
  setPostReaction,
  subscribeActivities,
  subscribePosts,
  subscribeSchoolUsers,
  subscribeStories,
  toggleFollowUser,
  toggleLikeOnPost,
} from "../services/socialService";
import { hapticTap } from "../services/haptics";
import { formatRelativeDateTime } from "../services/firestoreUtils";
import { ActivityItem, PostItem, SchoolNewsItem, StoryItem, UserProfile } from "../types/social";
import { FeedItem } from "../types/feed";
import { formatCompactNumber, getTimeGreeting } from "../utils/format";

const MOODS = ["😀", "😎", "🤓", "😴", "🔥", "💡"];

const SOCIAL_WIDGETS = [
  {
    id: "instagram",
    name: "Instagram",
    brand: "#E1306C",
    latest: "Latest: Chapter recap reel posted today",
    imageUrl: "https://picsum.photos/400/300?random=941",
    appUrl: "instagram://user?username=fbla",
    webUrl: "https://instagram.com/fbla",
  },
  {
    id: "x",
    name: "Twitter / X",
    brand: "#1D9BF0",
    latest: "Latest: New competition update thread",
    imageUrl: "https://picsum.photos/400/300?random=942",
    appUrl: "twitter://user?screen_name=fbla",
    webUrl: "https://x.com/fbla",
  },
  {
    id: "tiktok",
    name: "TikTok",
    brand: "#111111",
    latest: "Latest: Event prep tips short video",
    imageUrl: "https://picsum.photos/400/300?random=943",
    appUrl: "snssdk1128://user/profile",
    webUrl: "https://www.tiktok.com/@fbla",
  },
  {
    id: "youtube",
    name: "YouTube",
    brand: "#FF0000",
    latest: "Latest: FBLA chapter livestream replay",
    imageUrl: "https://picsum.photos/400/300?random=944",
    appUrl: "vnd.youtube://channel/UC",
    webUrl: "https://www.youtube.com/results?search_query=fbla",
  },
  {
    id: "snapchat",
    name: "Snapchat",
    brand: "#FACC15",
    latest: "Latest: Story from chapter spirit day",
    imageUrl: "https://picsum.photos/400/300?random=945",
    appUrl: "snapchat://",
    webUrl: "https://www.snapchat.com",
  },
];

async function openPlatform(appUrl: string, webUrl: string): Promise<void> {
  try {
    const can = await Linking.canOpenURL(appUrl);
    if (can) {
      await Linking.openURL(appUrl);
      return;
    }
  } catch {
    // fallback to web
  }
  await Linking.openURL(webUrl);
}

function ShimmerCard({ label, value, borderColor }: { label: string; value: string; borderColor: string }) {
  const shimmer = useSharedValue(-220);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(withTiming(220, { duration: 1600 }), withTiming(-220, { duration: 0 })),
      -1,
      false,
    );
  }, [shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value }],
  }));

  return (
    <GlassSurface style={{ width: "48%", padding: 10, borderRadius: 14, borderColor, overflow: "hidden" }}>
      <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: 120, opacity: 0.22 }, shimmerStyle]}>
        <LinearGradient colors={["transparent", "rgba(255,255,255,0.85)", "transparent"]} style={{ flex: 1 }} />
      </Animated.View>
      <Text style={{ color: "#64748B", fontSize: 12 }}>{label}</Text>
      <Text style={{ color: "#0F172A", fontWeight: "900", marginTop: 4 }}>{value}</Text>
    </GlassSurface>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, loading: authLoading } = useAuthContext();
  const { handleAwardResult } = useGamification();
  const { palette } = useThemeContext();
  const divider = (
    <View
      style={{
        height: 1,
        backgroundColor: palette.colors.border,
        marginVertical: 12,
      }}
    />
  );

  const [announcements, setAnnouncements] = useState<FeedItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [schoolNews, setSchoolNews] = useState<SchoolNewsItem[]>([]);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);
  const [feedTab, setFeedTab] = useState("for_you");
  const [searchQuery, setSearchQuery] = useState("");
  const [newPostsCount, setNewPostsCount] = useState(0);

  const topPostRef = useRef<string | null>(null);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const unsubscribers = [
      subscribePosts(profile.schoolId, setPosts),
      subscribeActivities(profile.schoolId, setActivities),
      subscribeStories(profile.schoolId, setStories),
      subscribeSchoolUsers(profile.schoolId, setUsers),
    ];

    void Promise.all([
      fetchAnnouncements(),
      fetchPostsOnce(profile.schoolId),
      fetchActivitiesOnce(profile.schoolId),
      fetchStoriesOnce(profile.schoolId),
      fetchSchoolUsersOnce(profile.schoolId),
      fetchSchoolNewsOnce(profile.schoolId),
    ])
      .then(([nextAnnouncements, nextPosts, nextActivities, nextStories, nextUsers, nextNews]) => {
        setAnnouncements(nextAnnouncements);
        setPosts(nextPosts);
        setActivities(nextActivities);
        setStories(nextStories);
        setUsers(nextUsers);
        setSchoolNews(nextNews);
      })
      .catch((error) => {
        console.warn("Home bootstrap failed:", error);
      })
      .finally(() => {
        setBootstrapping(false);
      });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [profile?.schoolId]);

  useEffect(() => {
    if (posts.length === 0) {
      return;
    }
    const nextTop = posts[0].id;
    if (!topPostRef.current) {
      topPostRef.current = nextTop;
      return;
    }
    if (topPostRef.current !== nextTop) {
      topPostRef.current = nextTop;
      setNewPostsCount((prev) => prev + 1);
    }
  }, [posts]);

  const refresh = async () => {
    if (!profile) {
      return;
    }

    setRefreshing(true);
    try {
      const [nextAnnouncements, nextPosts, nextActivities, nextStories, nextUsers, nextNews] = await Promise.all([
        fetchAnnouncements(),
        fetchPostsOnce(profile.schoolId),
        fetchActivitiesOnce(profile.schoolId),
        fetchStoriesOnce(profile.schoolId),
        fetchSchoolUsersOnce(profile.schoolId),
        fetchSchoolNewsOnce(profile.schoolId),
      ]);
      setAnnouncements(nextAnnouncements);
      setPosts(nextPosts);
      setActivities(nextActivities);
      setStories(nextStories);
      setUsers(nextUsers);
      setSchoolNews(nextNews);
      setNewPostsCount(0);
    } catch (error) {
      console.warn("Home refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const userLookup = useMemo(() => new Map(users.map((user) => [user.uid, user])), [users]);

  const suggestedFriends = useMemo(() => {
    if (!profile) {
      return [];
    }
    return getSuggestedFriends(users, profile);
  }, [users, profile]);

  const filteredPosts = useMemo(() => {
    if (!profile) {
      return [];
    }

    const base = searchQuery.trim()
      ? posts.filter((post) => post.content.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      : posts;

    if (feedTab === "following") {
      return base.filter((post) => profile.followingIds.includes(post.authorId));
    }
    if (feedTab === "trending") {
      return getTrendingPosts(base);
    }
    if (feedTab === "school") {
      return base.filter((post) => post.schoolId === profile.schoolId);
    }
    return base;
  }, [feedTab, posts, profile, searchQuery]);

  const trending = useMemo(() => getTrendingPosts(posts), [posts]);

  const campusPulse = useMemo(() => {
    const topStudent = [...users].sort((a, b) => b.xp - a.xp)[0];
    return [
      { id: "online", label: "Students Online", value: `${47 + (users.length % 11)}`, border: "#60A5FA" },
      { id: "events", label: "Events This Week", value: `${Math.max(3, announcements.length)}`, border: "#F59E0B" },
      { id: "top", label: "Top Student", value: topStudent?.displayName ?? "TBD", border: "#22C55E" },
      { id: "feed", label: "New Feed Items", value: `${activities.length}`, border: "#A855F7" },
    ];
  }, [users, announcements.length, activities.length]);

  const storiesWithMood = useMemo(() => {
    return stories.map((story) => {
      const user = userLookup.get(story.userId);
      return {
        ...story,
        avatarUrl: user?.avatarUrl,
        moodEmoji: user?.moodEmoji,
      };
    });
  }, [stories, userLookup]);

  if (authLoading || !profile) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.colors.background }}>
        <ActivityIndicator animating size="large" />
      </View>
    );
  }

  const pinnedNews = schoolNews.find((item) => item.pinned) ?? schoolNews[0];

  return (
    <View style={{ flex: 1, backgroundColor: palette.colors.background }}>
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
        ListHeaderComponent={
          <View>
            <GlassSurface style={{ marginBottom: 12, padding: 12 }}>
              <Text style={{ fontWeight: "900", fontSize: 24, color: "#0F172A" }}>{getTimeGreeting(profile.displayName.split(" ")[0])}</Text>
              <Text style={{ color: "#64748B", marginTop: 3 }}>Welcome to FBLA Atlas.</Text>
              <TextInput
                mode="outlined"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search the campus app..."
                left={<TextInput.Icon icon="magnify" />}
                style={{ marginTop: 10 }}
              />
            </GlassSurface>

            {pinnedNews ? (
              <GlassSurface style={{ marginBottom: 12, padding: 10, borderLeftWidth: 4, borderLeftColor: "#2563EB" }}>
                <Image source={pinnedNews.bannerUrl || "https://picsum.photos/400/300?random=946"} style={{ width: "100%", height: 120, borderRadius: 12 }} />
                <Text style={{ marginTop: 8, fontWeight: "900" }}>Pinned School News</Text>
                <Text style={{ color: "#0F172A", fontWeight: "700" }}>{pinnedNews.title}</Text>
                <Text style={{ color: "#475569" }}>{pinnedNews.body}</Text>
              </GlassSurface>
            ) : null}

            <GlassSurface style={{ marginBottom: 12, padding: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text variant="titleMedium" style={{ fontWeight: "800" }}>Stories</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {MOODS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => {
                        hapticTap();
                        void setMoodForUser(profile.uid, emoji);
                      }}
                      style={{ minWidth: 24, minHeight: 24 }}
                    >
                      <Text>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ marginTop: 10 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 18 }}>
                  {storiesWithMood.map((story, index) => (
                    <Pressable
                      key={story.id}
                      onPress={() => {
                        hapticTap();
                        setSelectedStory(story);
                      }}
                    >
                      <Animated.View entering={FadeInUp.delay(index * 35).duration(280)} style={{ alignItems: "center", width: 72 }}>
                        <Avatar.Image size={56} source={{ uri: story.avatarUrl || "https://i.pravatar.cc/150?img=9" }} />
                        <Text numberOfLines={1} style={{ fontSize: 12, marginTop: 4 }}>{story.userName.split(" ")[0]} {story.moodEmoji ?? ""}</Text>
                      </Animated.View>
                    </Pressable>
                  ))}
                </ScrollView>
                <LinearGradient
                  colors={["rgba(246,247,248,0)", palette.colors.background]}
                  style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 34 }}
                  pointerEvents="none"
                />
              </View>
            </GlassSurface>

            {divider}

            <GlassSurface style={{ marginBottom: 12, padding: 10 }}>
              <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>Campus Pulse</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {campusPulse.map((card) => (
                  <ShimmerCard key={card.id} label={card.label} value={card.value} borderColor={card.border} />
                ))}
              </View>
            </GlassSurface>

            {divider}

            <GlassSurface style={{ marginBottom: 12, padding: 10 }}>
              <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>Trending</Text>
              <View style={{ gap: 8 }}>
                {trending.slice(0, 3).map((post, index) => (
                  <View key={post.id} style={{ borderRadius: 12, backgroundColor: "#F8FAFC", padding: 10 }}>
                    <Text style={{ color: "#0F172A", fontWeight: "800" }}>🔥 #{index + 1} {post.authorName}</Text>
                    <Text style={{ color: "#334155" }} numberOfLines={2}>{post.content}</Text>
                    <Text style={{ color: "#64748B", marginTop: 3 }}>{formatCompactNumber(post.likeCount)} likes</Text>
                  </View>
                ))}
                {trending.length === 0 ? <Text style={{ color: "#64748B" }}>No trending posts yet.</Text> : null}
              </View>
            </GlassSurface>

            {divider}

            <GlassSurface style={{ marginBottom: 12, padding: 10 }}>
              <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>Campus Social Feed</Text>
              <SegmentedButtons
                value={feedTab}
                onValueChange={setFeedTab}
                buttons={[
                  { value: "for_you", label: "For You" },
                  { value: "following", label: "Following" },
                  { value: "trending", label: "Trending" },
                  { value: "school", label: "School" },
                ]}
              />
              {newPostsCount > 0 ? (
                <Button
                  mode="contained-tonal"
                  style={{ marginTop: 8 }}
                  onPress={() => {
                    hapticTap();
                    setNewPostsCount(0);
                    void refresh();
                  }}
                >
                  {newPostsCount} new posts
                </Button>
              ) : null}
            </GlassSurface>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.delay(index * 35).duration(260)}>
            <PostCard
              post={item}
              currentUser={profile}
              author={userLookup.get(item.authorId)}
              onPressAuthor={(uid) => navigation.navigate("StudentProfile", { userId: uid })}
              onToggleLike={async (post) => {
                try {
                  await toggleLikeOnPost(post, profile);
                } catch (error) {
                  console.warn("Like action failed:", error);
                }
              }}
              onReact={async (post, emoji) => {
                try {
                  await setPostReaction(post, profile, emoji);
                } catch (error) {
                  console.warn("Reaction failed:", error);
                }
              }}
              onAddComment={async (post, text) => {
                try {
                  const result = await addCommentToPost(post, profile, text);
                  handleAwardResult(result);
                } catch (error) {
                  console.warn("Comment failed:", error);
                }
              }}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          bootstrapping ? (
            <View>
              <SkeletonCard height={220} />
              <SkeletonCard height={220} />
              <SkeletonCard height={220} />
            </View>
          ) : (
            <EmptyState title="No Posts" message="Your feed is empty right now. Pull to refresh." />
          )
        }
        ListFooterComponent={
          <View>
            {divider}
            <GlassSurface style={{ marginBottom: 12, padding: 10 }}>
              <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>Suggested Friends</Text>
              {suggestedFriends.length > 0 ? (
                suggestedFriends.slice(0, 4).map((user) => (
                  <View key={user.uid} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <Pressable
                      onPress={() => {
                        hapticTap();
                        navigation.navigate("StudentProfile", { userId: user.uid });
                      }}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
                    >
                      <Avatar.Image size={36} source={{ uri: user.avatarUrl }} />
                      <View>
                        <Text style={{ fontWeight: "700" }}>{user.displayName}</Text>
                        <Text style={{ color: "#64748B", fontSize: 12 }}>{user.grade}th grade</Text>
                      </View>
                    </Pressable>
                    <Button
                      mode="outlined"
                      onPress={async () => {
                        hapticTap();
                        try {
                          const result = await toggleFollowUser(profile, user);
                          handleAwardResult(result.award);
                        } catch (error) {
                          console.warn("Follow failed:", error);
                        }
                      }}
                    >
                      Follow
                    </Button>
                  </View>
                ))
              ) : (
                <Text style={{ color: "#64748B" }}>No suggestions right now.</Text>
              )}
            </GlassSurface>

            <GlassSurface style={{ marginBottom: 12, padding: 10 }}>
              <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>Social Hub</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {SOCIAL_WIDGETS.map((widget) => (
                  <Pressable
                    key={widget.id}
                    onPress={() => {
                      hapticTap();
                      void openPlatform(widget.appUrl, widget.webUrl);
                    }}
                    style={{ width: 194 }}
                  >
                    <GlassSurface style={{ borderColor: widget.brand, padding: 10 }}>
                      <Image source={widget.imageUrl} style={{ width: "100%", height: 88, borderRadius: 12 }} />
                      <Text style={{ fontWeight: "900", color: widget.brand, marginTop: 6 }}>{widget.name}</Text>
                      <Text style={{ color: "#475569", marginTop: 2 }}>{widget.latest}</Text>
                    </GlassSurface>
                  </Pressable>
                ))}
              </ScrollView>
            </GlassSurface>

            <GlassSurface style={{ marginBottom: 12, padding: 10 }}>
              <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>Announcements</Text>
              <View style={{ gap: 8 }}>
                {announcements.map((item) => (
                  <View key={item.id} style={{ borderRadius: 12, overflow: "hidden", backgroundColor: "#F8FAFC" }}>
                    <Image source={`https://picsum.photos/400/300?random=${Math.abs(item.id.length * 37) + 950}`} style={{ width: "100%", height: 110 }} />
                    <View style={{ padding: 10 }}>
                      <Text style={{ fontWeight: "800" }}>{item.title}</Text>
                      <Text style={{ color: "#334155" }}>{item.body}</Text>
                      <Text style={{ color: "#64748B", marginTop: 4 }}>{item.author}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </GlassSurface>

            <GlassSurface style={{ padding: 10 }}>
              <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>Activity Snapshot</Text>
              {activities.slice(0, 6).map((activity) => (
                <View key={activity.id} style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
                  <Avatar.Text size={32} label={activity.actorName.slice(0, 1).toUpperCase()} style={{ backgroundColor: activity.actorAvatarColor }} />
                  <View style={{ flex: 1 }}>
                    <Text>{activity.message}</Text>
                    <Text style={{ color: "#64748B", fontSize: 12 }}>{formatRelativeDateTime(activity.createdAt)}</Text>
                  </View>
                </View>
              ))}
              {activities.length === 0 ? <Text style={{ color: "#64748B" }}>No activity yet.</Text> : null}
            </GlassSurface>
          </View>
        }
      />

      <StoryViewerModal story={selectedStory} onClose={() => setSelectedStory(null)} />

      <Pressable
        onPress={() => {
          hapticTap();
          navigation.navigate("CreatePost");
        }}
        style={{
          position: "absolute",
          right: 18,
          bottom: 24,
          minWidth: 56,
          minHeight: 56,
          borderRadius: 28,
          backgroundColor: "#2563EB",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#2563EB",
          shadowOpacity: 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Text style={{ color: "white", fontWeight: "800" }}>＋</Text>
      </Pressable>
    </View>
  );
}
