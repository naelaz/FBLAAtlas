import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Share, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Button, Text, TextInput } from "react-native-paper";
import ViewShot, { captureRef } from "react-native-view-shot";

import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { AppImage } from "../components/media/AppImage";
import { Badge, getTierBadgeVariant } from "../components/ui/badge";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassSurface } from "../components/ui/GlassSurface";
import { ScreenShell } from "../components/ScreenShell";
import { useAuthContext } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useThemeContext } from "../context/ThemeContext";
import { getNextTier, getTierForXp, getXpProgress } from "../constants/gamification";
import { RootStackParamList } from "../navigation/types";
import { formatRelativeDateTime } from "../services/firestoreUtils";
import { hapticSuccess, hapticTap } from "../services/haptics";
import { fetchPostsOnce, fetchRecentActivityForUser, fetchSchoolUsersOnce } from "../services/socialService";
import { updateUserProfileFields } from "../services/userService";
import { APP_THEMES } from "../constants/themes";
import { getCampusImage } from "../constants/media";
import { ActivityItem, PostItem, UserProfile } from "../types/social";
import { formatCompactNumber } from "../utils/format";

type StatSheetType = "posts" | "followers" | "following" | null;

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, refreshProfile } = useAuthContext();
  const { settings, updateSettings } = useSettings();
  const { palette } = useThemeContext();

  const [refreshing, setRefreshing] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [usersById, setUsersById] = useState<Map<string, UserProfile>>(new Map());
  const [statSheet, setStatSheet] = useState<StatSheetType>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const shareCardRef = useRef<ViewShot>(null);

  const fill = useSharedValue(0);

  const refresh = async () => {
    if (!profile) {
      return;
    }

    setRefreshing(true);
    try {
      await refreshProfile();
      const [recent, userPosts, users] = await Promise.all([
        fetchRecentActivityForUser(profile.schoolId, profile.uid),
        fetchPostsOnce(profile.schoolId),
        fetchSchoolUsersOnce(profile.schoolId),
      ]);
      setActivity(recent.slice(0, 5));
      setPosts(userPosts.filter((item) => item.authorId === profile.uid));
      setUsersById(new Map(users.map((user) => [user.uid, user])));
    } catch (error) {
      console.warn("Profile refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!profile) {
      return;
    }

    setEditName(profile.displayName);
    setEditBio(profile.bio);

    void Promise.all([
      fetchRecentActivityForUser(profile.schoolId, profile.uid),
      fetchPostsOnce(profile.schoolId),
      fetchSchoolUsersOnce(profile.schoolId),
    ])
      .then(([recent, userPosts, users]) => {
        setActivity(recent.slice(0, 5));
        setPosts(userPosts.filter((item) => item.authorId === profile.uid));
        setUsersById(new Map(users.map((user) => [user.uid, user])));
      })
      .catch((error) => {
        console.warn("Profile bootstrap failed:", error);
      });
  }, [profile?.uid, profile?.schoolId]);

  const progressValue = profile ? getXpProgress(profile.xp).progress : 0;
  useEffect(() => {
    fill.value = withTiming(progressValue, { duration: 560 });
  }, [fill, progressValue]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, fill.value * 100))}%`,
  }));

  if (!profile) {
    return (
      <ScreenShell title="Profile" subtitle="Loading profile...">
        <EmptyState title="Loading" message="Fetching your profile..." />
      </ScreenShell>
    );
  }

  const progressInfo = getXpProgress(profile.xp);
  const tier = getTierForXp(profile.xp);
  const nextTier = getNextTier(profile.xp);
  const profileHeaderImage = posts[0]?.imageUrl ?? profile.avatarUrl ?? getCampusImage(profile.uid);

  const followers = profile.followerIds.map((id) => usersById.get(id)).filter(Boolean) as UserProfile[];
  const following = profile.followingIds.map((id) => usersById.get(id)).filter(Boolean) as UserProfile[];

  const statList: Array<{ id: string; title: string; subtitle: string; avatarUrl?: string }> =
    statSheet === "posts"
      ? posts.map((post) => ({ id: post.id, title: post.content, subtitle: `${formatCompactNumber(post.likeCount)} likes` }))
      : (statSheet === "followers" ? followers : following).map((user) => ({
          id: user.uid,
          title: user.displayName,
          subtitle: `${user.grade}th grade`,
          avatarUrl: user.avatarUrl,
        }));

  const handleShareProfile = async () => {
    try {
      const uri = await captureRef(shareCardRef, {
        format: "png",
        quality: 1,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        await Share.share({ message: "Check out my FBLA Atlas profile!" });
      }
      hapticSuccess();
    } catch (error) {
      console.warn("Share profile failed:", error);
    }
  };

  return (
    <ScreenShell
      title="Profile"
      subtitle="Your XP, streaks, badges, and account controls."
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    >
      <View style={{ borderRadius: 20, overflow: "hidden", marginBottom: 12 }}>
        <AppImage uri={profileHeaderImage} style={{ width: "100%", height: 208 }} />
        <BlurView intensity={80} tint="dark" style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0 }} />

        <View style={{ position: "absolute", left: 0, right: 0, top: 14, alignItems: "center" }}>
          <AvatarWithStatus uri={profile.avatarUrl} size={84} online />
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 }}>
            <Text style={{ color: "white", fontWeight: "900", fontSize: 22 }}>{profile.displayName}</Text>
            <View
              style={{
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 5,
                backgroundColor: tier.color,
                shadowColor: tier.color,
                shadowOpacity: 0.45,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 3 },
              }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>{profile.tier}</Text>
            </View>
          </View>
          <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>{profile.schoolName}</Text>
          <Text style={{ color: palette.colors.warning, marginTop: 3 }}>🔥 {profile.streakCount} day streak</Text>
        </View>

        <GlassSurface
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
            padding: 10,
            backgroundColor: palette.colors.glassStrong,
            borderColor: palette.colors.glassBorder,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            <Pressable
              onPress={() => {
                hapticTap();
                setStatSheet("posts");
              }}
              style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>{formatCompactNumber(posts.length)}</Text>
              <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>Posts</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                hapticTap();
                setStatSheet("followers");
              }}
              style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>{formatCompactNumber(profile.followerIds.length)}</Text>
              <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>Followers</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                hapticTap();
                setStatSheet("following");
              }}
              style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>{formatCompactNumber(profile.followingIds.length)}</Text>
              <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>Following</Text>
            </Pressable>
          </View>
        </GlassSurface>
      </View>

      <GlassSurface
        style={{
          padding: 12,
          marginBottom: 12,
          backgroundColor: palette.colors.glass,
          borderColor: palette.colors.glassBorder,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ fontWeight: "800", color: palette.colors.text }}>
            XP {formatCompactNumber(profile.xp)}
          </Text>
          <Text style={{ color: palette.colors.textSecondary }}>
            {nextTier ? `${formatCompactNumber(profile.xp)} / ${formatCompactNumber(nextTier.minXp)}` : "Max Tier"}
          </Text>
        </View>
        <View style={{ height: 12, borderRadius: 999, backgroundColor: palette.colors.inputMuted, overflow: "hidden" }}>
          <Animated.View style={[{ height: 12, backgroundColor: tier.color, borderRadius: 999 }, barStyle]} />
        </View>
      </GlassSurface>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <Button
          mode="outlined"
          style={{ flex: 1 }}
          onPress={() => {
            hapticTap();
            setEditOpen(true);
          }}
        >
          Edit Profile
        </Button>
        <Button
          mode="outlined"
          style={{ flex: 1 }}
          onPress={() => {
            hapticTap();
            void handleShareProfile();
          }}
        >
          Share Profile
        </Button>
      </View>

      <Button
        mode="contained-tonal"
        style={{ marginBottom: 12 }}
        onPress={() => {
          hapticTap();
          void Share.share({
            message: "Join me on FBLA Atlas! Track events, XP tiers, and campus updates together.",
          });
        }}
      >
        Invite Friends
      </Button>

      <GlassSurface style={{ marginBottom: 12, padding: 12 }}>
        <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>
          Theme Picker
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {APP_THEMES.map((theme) => {
            const selected = settings.appearance.themeName === theme.name;
            return (
              <Pressable
                key={theme.name}
                onPress={() => {
                  hapticTap();
                  void updateSettings((prev) => ({
                    ...prev,
                    appearance: {
                      ...prev.appearance,
                      themeName: theme.name,
                    },
                  }));
                }}
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  borderWidth: selected ? 3 : 1,
                  borderColor: selected ? theme.colors.primary : palette.colors.border,
                  overflow: "hidden",
                }}
              >
                <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
                <View style={{ height: 20, backgroundColor: theme.colors.primary }} />
              </Pressable>
            );
          })}
        </ScrollView>
      </GlassSurface>

      <GlassSurface style={{ marginBottom: 12, padding: 12 }}>
        <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>
          Badges
        </Text>
        {profile.badges.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {profile.badges.map((badge) => (
              <Badge key={badge} variant={getTierBadgeVariant(profile.tier)} size="sm" capitalize={false}>
                {badge}
              </Badge>
            ))}
          </ScrollView>
        ) : (
          <EmptyState title="No Badges Yet" message="Keep engaging to unlock milestone badges." />
        )}
      </GlassSurface>

      <GlassSurface style={{ padding: 12 }}>
        <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>
          Recent Activity
        </Text>
        {activity.length > 0 ? (
          activity.map((item) => (
            <View
              key={item.id}
              style={{
                borderBottomWidth: 1,
                borderBottomColor: palette.colors.divider,
                paddingBottom: 8,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: palette.colors.text }}>{item.message}</Text>
              <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>
                {formatRelativeDateTime(item.createdAt)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ color: palette.colors.textSecondary }}>No recent activity yet.</Text>
        )}
      </GlassSurface>

      <Modal visible={statSheet !== null} transparent animationType="slide" onRequestClose={() => setStatSheet(null)}>
        <Pressable style={{ flex: 1, backgroundColor: palette.colors.overlay, justifyContent: "flex-end" }} onPress={() => setStatSheet(null)}>
          <Pressable>
            <View style={{ backgroundColor: palette.colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, maxHeight: "70%" }}>
              <Text variant="titleLarge" style={{ fontWeight: "900", marginBottom: 10 }}>
                {statSheet === "posts" ? "Posts" : statSheet === "followers" ? "Followers" : "Following"}
              </Text>
              <ScrollView contentContainerStyle={{ gap: 8 }}>
                {statList.length > 0 ? (
                  statList.map((row) => (
                    <View key={row.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}>
                      {row.avatarUrl ? <AvatarWithStatus uri={row.avatarUrl} size={32} online /> : null}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "800" }} numberOfLines={2}>
                          {row.title}
                        </Text>
                        <Text style={{ color: palette.colors.textSecondary }}>{row.subtitle}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={{ color: palette.colors.textSecondary }}>No items to show.</Text>
                )}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: palette.colors.overlay, justifyContent: "flex-end" }} onPress={() => setEditOpen(false)}>
          <Pressable>
            <View style={{ backgroundColor: palette.colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, gap: 10 }}>
              <Text variant="titleLarge" style={{ fontWeight: "900" }}>Edit Profile</Text>
              <TextInput mode="outlined" label="Display Name" value={editName} onChangeText={setEditName} />
              <TextInput mode="outlined" label="Bio" value={editBio} onChangeText={setEditBio} multiline />
              <Button
                mode="contained"
                loading={savingEdit}
                disabled={!editName.trim() || savingEdit}
                onPress={async () => {
                  setSavingEdit(true);
                  try {
                    await updateUserProfileFields(profile.uid, {
                      displayName: editName.trim(),
                      bio: editBio.trim(),
                    });
                    hapticSuccess();
                    setEditOpen(false);
                    await refreshProfile();
                  } catch (error) {
                    console.warn("Save profile edit failed:", error);
                  } finally {
                    setSavingEdit(false);
                  }
                }}
              >
                Save
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={{ position: "absolute", left: -1000, top: -1000 }}>
        <ViewShot ref={shareCardRef} options={{ format: "png", quality: 1 }}>
          <View style={{ width: 360, backgroundColor: palette.colors.background, borderRadius: 18, padding: 16 }}>
            <Text style={{ color: "white", fontSize: 24, fontWeight: "900" }}>FBLA Atlas</Text>
            <Text style={{ color: palette.colors.secondary, marginTop: 4 }}>{profile.schoolName}</Text>
            <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <AppImage uri={profile.avatarUrl} style={{ width: 62, height: 62, borderRadius: 31 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>{profile.displayName}</Text>
                <Text style={{ color: palette.colors.textSecondary }}>
                  {profile.tier} Tier • {formatCompactNumber(profile.xp)} XP
                </Text>
              </View>
            </View>
            <Text style={{ color: palette.colors.textSecondary, marginTop: 12 }}>Top Badges</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              {profile.badges.slice(0, 3).map((badge) => (
                <View
                  key={badge}
                  style={{
                    backgroundColor: palette.colors.inputMuted,
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ color: palette.colors.text }}>{badge}</Text>
                </View>
              ))}
            </View>
          </View>
        </ViewShot>
      </View>

      <Button mode="outlined" style={{ marginTop: 12 }} onPress={() => navigation.navigate("Leaderboard")}>
        View Leaderboard
      </Button>
    </ScreenShell>
  );
}

