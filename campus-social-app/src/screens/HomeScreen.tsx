import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { Bell, Globe, LucideIcon, Settings, Sparkles, SquarePen, Trophy } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Linking, Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { ActivityIndicator, Avatar, Button, SegmentedButtons, Text, TextInput } from "react-native-paper";

import { AppImage } from "../components/media/AppImage";
import { PostCard } from "../components/social/PostCard";
import { StoryAvatar } from "../components/social/StoryAvatar";
import { StoryViewerModal } from "../components/social/StoryViewerModal";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassSurface } from "../components/ui/GlassSurface";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { getCampusImage, getNewsBannerImage, SOCIAL_WIDGET_IMAGES } from "../constants/media";
import { BRAND_COLORS } from "../constants/themes";
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

const MOODS = ["\u{1F600}", "\u{1F60E}", "\u{1F913}", "\u{1F634}", "\u{1F525}", "\u{1F4A1}"];

const SOCIAL_WIDGETS = [
  {
    id: "instagram",
    name: "Instagram",
    brand: BRAND_COLORS.instagram,
    latest: "Latest: Chapter recap reel posted today",
    imageUrl: SOCIAL_WIDGET_IMAGES.instagram,
    appUrl: "instagram://user?username=fbla",
    webUrl: "https://instagram.com/fbla",
  },
  {
    id: "x",
    name: "Twitter / X",
    brand: BRAND_COLORS.x,
    latest: "Latest: New competition update thread",
    imageUrl: SOCIAL_WIDGET_IMAGES.x,
    appUrl: "twitter://user?screen_name=fbla",
    webUrl: "https://x.com/fbla",
  },
  {
    id: "tiktok",
    name: "TikTok",
    brand: BRAND_COLORS.tiktok,
    latest: "Latest: Event prep tips short video",
    imageUrl: SOCIAL_WIDGET_IMAGES.tiktok,
    appUrl: "snssdk1128://user/profile",
    webUrl: "https://www.tiktok.com/@fbla",
  },
  {
    id: "youtube",
    name: "YouTube",
    brand: BRAND_COLORS.youtube,
    latest: "Latest: FBLA chapter livestream replay",
    imageUrl: SOCIAL_WIDGET_IMAGES.youtube,
    appUrl: "vnd.youtube://channel/UC",
    webUrl: "https://www.youtube.com/results?search_query=fbla",
  },
  {
    id: "snapchat",
    name: "Snapchat",
    brand: BRAND_COLORS.snapchat,
    latest: "Latest: Story from chapter spirit day",
    imageUrl: SOCIAL_WIDGET_IMAGES.snapchat,
    appUrl: "snapchat://",
    webUrl: "https://www.snapchat.com",
  },
];

type QuickActionItem = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  onPress: () => void;
};

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

function ShimmerCard({
  label,
  value,
  borderColor,
  labelColor,
  valueColor,
}: {
  label: string;
  value: string;
  borderColor: string;
  labelColor: string;
  valueColor: string;
}) {
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
        <LinearGradient colors={["transparent", borderColor, "transparent"]} style={{ flex: 1 }} />
      </Animated.View>
      <Text style={{ color: labelColor, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: valueColor, fontWeight: "900", marginTop: 4 }}>{value}</Text>
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
      { id: "online", label: "Students Online", value: `${47 + (users.length % 11)}`, border: palette.colors.info },
      { id: "events", label: "Events This Week", value: `${Math.max(3, announcements.length)}`, border: palette.colors.warning },
      { id: "top", label: "Top Student", value: topStudent?.displayName ?? "TBD", border: palette.colors.success },
      { id: "feed", label: "New Feed Items", value: `${activities.length}`, border: palette.colors.secondary },
    ];
  }, [users, announcements.length, activities.length, palette.colors.info, palette.colors.warning, palette.colors.success, palette.colors.secondary]);

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

  const quickActions = useMemo<QuickActionItem[]>(
    () => [
      {
        id: "notifications",
        title: "Notifications",
        description: "Alerts and mentions",
        icon: Bell,
        accent: palette.colors.info,
        onPress: () => navigation.navigate("Notifications"),
      },
      {
        id: "leaderboard",
        title: "Leaderboard",
        description: "Top XP this week",
        icon: Trophy,
        accent: palette.colors.warning,
        onPress: () => navigation.navigate("Leaderboard"),
      },
      {
        id: "settings",
        title: "Settings",
        description: "Privacy and themes",
        icon: Settings,
        accent: palette.colors.secondary,
        onPress: () => navigation.navigate("Settings"),
      },
      {
        id: "compose",
        title: "New Post",
        description: "Share an update",
        icon: SquarePen,
        accent: palette.colors.primary,
        onPress: () => navigation.navigate("CreatePost"),
      },
      {
        id: "finn",
        title: "Finn Coach",
        description: "AI help and planning",
        icon: Sparkles,
        accent: palette.colors.secondary,
        onPress: () => navigation.navigate("Finn"),
      },
      {
        id: "fbla",
        title: "FBLA.org",
        description: "Official resources",
        icon: Globe,
        accent: BRAND_COLORS.youtube,
        onPress: () => {
          void Linking.openURL("https://www.fbla.org");
        },
      },
    ],
    [navigation, palette.colors.info, palette.colors.warning, palette.colors.secondary, palette.colors.primary],
  );

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
              <Text style={{ fontWeight: "900", fontSize: 24, color: palette.colors.text }}>
                {getTimeGreeting(profile.displayName.split(" ")[0])}
              </Text>
              <Text style={{ color: palette.colors.textSecondary, marginTop: 3 }}>
                Welcome to FBLA Atlas.
              </Text>
              <TextInput
                mode="outlined"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search the campus app..."
                left={<TextInput.Icon icon="magnify" />}
                style={{ marginTop: 10 }}
              />
            </GlassSurface>

            <GlassSurface style={{ marginBottom: 12, padding: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text variant="titleMedium" style={{ fontWeight: "800" }}>
                  Quick Actions
                </Text>
                <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>Shortcuts</Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Pressable
                      key={action.id}
                      onPress={() => {
                        hapticTap();
                        action.onPress();
                      }}
                      style={{
                        width: "48%",
                        minHeight: 80,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: palette.colors.border,
                        backgroundColor: palette.colors.surfaceSoft,
                        paddingHorizontal: 10,
                        paddingVertical: 9,
                      }}
                    >
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: action.accent,
                          marginBottom: 6,
                        }}
                      >
                        <Icon size={16} color={palette.colors.onPrimary} strokeWidth={2.2} />
                      </View>
                      <Text style={{ color: palette.colors.text, fontWeight: "800" }}>{action.title}</Text>
                      <Text numberOfLines={1} style={{ color: palette.colors.textSecondary, fontSize: 12 }}>
                        {action.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </GlassSurface>

            {pinnedNews ? (
              <GlassSurface style={{ marginBottom: 12, padding: 10, borderLeftWidth: 4, borderLeftColor: palette.colors.leftAccent }}>
                <View style={{ borderRadius: 12, overflow: "hidden" }}>
                  <AppImage
                    uri={pinnedNews.bannerUrl || getNewsBannerImage(pinnedNews.id)}
                    style={{ width: "100%", aspectRatio: 3 }}
                    overlayReadable
                  />
                  <View style={{ position: "absolute", left: 12, right: 12, bottom: 10 }}>
                    <Text style={{ fontWeight: "900", color: "white" }}>Pinned School News</Text>
                    <Text style={{ color: "white", fontWeight: "800" }} numberOfLines={2}>
                      {pinnedNews.title}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: palette.colors.textSecondary, marginTop: 8 }}>{pinnedNews.body}</Text>
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
                      <Animated.View entering={FadeInUp.delay(index * 35).duration(280)}>
                        <StoryAvatar
                          userName={story.userName.split(" ")[0]}
                          avatarUrl={story.avatarUrl}
                          moodEmoji={story.moodEmoji}
                          seen={index % 3 === 0}
                        />
                      </Animated.View>
                    </Pressable>
                  ))}
                </ScrollView>
                <LinearGradient
                  colors={["transparent", palette.colors.background]}
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
                  <ShimmerCard
                    key={card.id}
                    label={card.label}
                    value={card.value}
                    borderColor={card.border}
                    labelColor={palette.colors.textSecondary}
                    valueColor={palette.colors.text}
                  />
                ))}
              </View>
            </GlassSurface>

            {divider}

            <GlassSurface style={{ marginBottom: 12, padding: 10 }}>
              <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>Trending</Text>
              <View style={{ gap: 8 }}>
                {trending.slice(0, 3).map((post, index) => (
                  <View key={post.id} style={{ borderRadius: 12, backgroundColor: palette.colors.surfaceSoft, padding: 10 }}>
                    <Text style={{ color: palette.colors.text, fontWeight: "800" }}>
                      {"\u{1F525}"} #{index + 1} {post.authorName}
                    </Text>
                    <Text style={{ color: palette.colors.textSecondary }} numberOfLines={2}>
                      {post.content}
                    </Text>
                    <Text style={{ color: palette.colors.textSecondary, marginTop: 3 }}>
                      {formatCompactNumber(post.likeCount)} likes
                    </Text>
                  </View>
                ))}
                {trending.length === 0 ? (
                  <Text style={{ color: palette.colors.textSecondary }}>No trending posts yet.</Text>
                ) : null}
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
                      <AvatarWithStatus uri={user.avatarUrl} size={36} online={false} />
                      <View>
                        <Text style={{ fontWeight: "700" }}>{user.displayName}</Text>
                        <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>
                          {user.grade}th grade
                        </Text>
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
                <Text style={{ color: palette.colors.textSecondary }}>No suggestions right now.</Text>
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
                      <AppImage uri={widget.imageUrl} style={{ width: "100%", height: 88, borderRadius: 12 }} />
                      <Text style={{ fontWeight: "900", color: widget.brand, marginTop: 6 }}>{widget.name}</Text>
                      <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>{widget.latest}</Text>
                    </GlassSurface>
                  </Pressable>
                ))}
              </ScrollView>
            </GlassSurface>

            <GlassSurface style={{ marginBottom: 12, padding: 10 }}>
              <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>Announcements</Text>
              <View style={{ gap: 8 }}>
                {announcements.map((item) => (
                  <View key={item.id} style={{ borderRadius: 12, overflow: "hidden", backgroundColor: palette.colors.surfaceSoft }}>
                    <AppImage uri={getCampusImage(item.id)} style={{ width: "100%", height: 110 }} overlayReadable />
                    <View style={{ padding: 10 }}>
                      <Text style={{ fontWeight: "800" }}>{item.title}</Text>
                      <Text style={{ color: palette.colors.textSecondary }}>{item.body}</Text>
                      <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>{item.author}</Text>
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
                    <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>
                      {formatRelativeDateTime(activity.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
              {activities.length === 0 ? (
                <Text style={{ color: palette.colors.textSecondary }}>No activity yet.</Text>
              ) : null}
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
          backgroundColor: palette.colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: palette.colors.primary,
          shadowOpacity: 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Text style={{ color: palette.colors.onPrimary, fontWeight: "800", fontSize: 22, lineHeight: 24 }}>+</Text>
      </Pressable>
    </View>
  );
}

