import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { ChevronDown, Plus, Search, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Modal, Pressable, ScrollView, Share, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Text } from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import ViewShot, { captureRef } from "react-native-view-shot";

import { AVATAR_COLORS, AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { Badge } from "../components/ui/badge";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassDropdown } from "../components/ui/GlassDropdown";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSegmentedControl } from "../components/ui/GlassSegmentedControl";
import { GlassSurface } from "../components/ui/GlassSurface";
import { TierBadge } from "../components/ui/TierBadge";
import { ScreenShell } from "../components/ScreenShell";
import { useAccessibility } from "../context/AccessibilityContext";
import { useAuthContext } from "../context/AuthContext";
import { useGamification } from "../context/GamificationContext";
import { useThemeContext } from "../context/ThemeContext";
import { FBLA_COMPETITIVE_EVENTS } from "../constants/fblaEvents";
import { getTierColor, getXpProgress } from "../constants/gamification";
import { useAnimationDuration } from "../hooks/useAnimationDuration";
import { RootStackParamList } from "../navigation/types";
import { fetchUserDuelStats } from "../services/challengeService";
import { fetchChapterDuesSettings, fetchMemberDuesStatus } from "../services/duesService";
import { formatRelativeDateTime } from "../services/firestoreUtils";
import { awardPointsToUser } from "../services/gamificationService";
import { hapticSuccess, hapticTap } from "../services/haptics";
import { submitPlacementToRecognitionWall } from "../services/recognitionService";
import { fetchPostsOnce, fetchRecentActivityForUser, fetchSchoolUsersOnce } from "../services/socialService";
import {
  clearProfileAvatar,
  subscribeUserProfile,
  updateUserProfileFields,
  uploadProfileAvatar,
} from "../services/userService";
import { ActivityItem, ChapterRole, OfficerPosition, PlacementLevel, PlacementResult, PostItem, UserPlacement, UserProfile } from "../types/social";
import { formatSchoolLabel, School, searchSchools } from "../utils/schoolSearch";
import { formatCompactNumber } from "../utils/format";

type StatSheetType = "posts" | "followers" | "following" | null;

type EditSectionKey = "role" | "school" | "events" | "achievements" | "bio";

const OFFICER_POSITIONS: OfficerPosition[] = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Reporter",
  "Parliamentarian",
  "Historian",
  "Member",
];

const CHAPTER_ROLE_OPTIONS: ChapterRole[] = [
  "Chapter Officer",
  "Regional Officer",
  "State Officer",
  "National Officer",
  "Alumni",
];

const PLACEMENT_OPTIONS: PlacementResult[] = [
  "1st",
  "2nd",
  "3rd",
  "Top 10",
  "Top 20",
  "Qualified",
  "Participant",
];

const LEVEL_OPTIONS: PlacementLevel[] = ["DLC", "SLC", "NLC"];

function placementBadgeColor(place: PlacementResult): string {
  if (place === "1st") return "#F59E0B"; // gold
  if (place === "2nd") return "#94A3B8"; // silver
  if (place === "3rd") return "#C97C4A"; // bronze
  return "#6366F1"; // indigo for others
}

function lightenHex(hex: string, amount = 0.15): string {
  const clean = hex.replace("#", "");
  const normalized =
    clean.length === 3
      ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
      : clean;
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "Profile">>();
  const route = useRoute<RouteProp<RootStackParamList, "Profile">>();
  const { profile: authProfile } = useAuthContext();
  const { palette } = useThemeContext();
  const { colorBlindMode } = useAccessibility();
  const { handleAwardResult } = useGamification();
  const xpFillDuration = useAnimationDuration(380);

  const [refreshing, setRefreshing] = useState(false);
  const [liveProfile, setLiveProfile] = useState<UserProfile | null>(authProfile);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [usersById, setUsersById] = useState<Map<string, UserProfile>>(new Map());
  const [statSheet, setStatSheet] = useState<StatSheetType>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editOfficerPosition, setEditOfficerPosition] = useState<OfficerPosition>("Member");
  const [editChapterRoles, setEditChapterRoles] = useState<ChapterRole[]>([]);
  const [editYearsServed, setEditYearsServed] = useState("");
  const [editSchoolName, setEditSchoolName] = useState("");
  const [editSchoolCity, setEditSchoolCity] = useState("");
  const [editSchoolState, setEditSchoolState] = useState("");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolResults, setSchoolResults] = useState<School[]>([]);
  const [schoolLoading, setSchoolLoading] = useState(false);
  const [schoolError, setSchoolError] = useState("");
  const [schoolRetryTick, setSchoolRetryTick] = useState(0);
  const [eventSearch, setEventSearch] = useState("");
  const [editCompetitiveEvents, setEditCompetitiveEvents] = useState<string[]>([]);
  const [maxEventsError, setMaxEventsError] = useState(false);
  const [editPlacements, setEditPlacements] = useState<UserPlacement[]>([]);
  const [newPlacementEvent, setNewPlacementEvent] = useState("");
  const [newPlacementPlace, setNewPlacementPlace] = useState<PlacementResult>("Participant");
  const [newPlacementLevel, setNewPlacementLevel] = useState<PlacementLevel>("DLC");
  const [newPlacementYear, setNewPlacementYear] = useState(String(new Date().getFullYear()));
  const [placementSearch, setPlacementSearch] = useState("");
  const [roleExperienceInput, setRoleExperienceInput] = useState("");
  const [editRoleExperiences, setEditRoleExperiences] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<EditSectionKey, boolean>>({
    role: true,
    school: false,
    events: false,
    achievements: false,
    bio: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileCompletionAwarded, setProfileCompletionAwarded] = useState(false);
  const [duelStats, setDuelStats] = useState<{ wins: number; losses: number }>({ wins: 0, losses: 0 });
  const [duesStatus, setDuesStatus] = useState<{ paid: boolean; deadline: string; paymentLink: string } | null>(null);

  const shareCardRef = useRef<ViewShot>(null);
  const xpFill = useSharedValue(0);
  const profile = liveProfile ?? authProfile;
  const safeXp = Math.max(0, profile?.xp ?? 0);
  const tierColor = getTierColor(profile?.tier ?? "Bronze");
  const xpProgress = getXpProgress(safeXp);
  const xpWithinTier = Math.max(0, safeXp - xpProgress.current.minXp);
  const xpTierSpan =
    xpProgress.next && xpProgress.current.maxXp !== null
      ? Math.max(1, xpProgress.current.maxXp - xpProgress.current.minXp - 1)
      : 1;

  const xpFillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, xpFill.value * 100))}%`,
  }));

  useEffect(() => {
    setLiveProfile(authProfile);
  }, [authProfile]);

  useEffect(() => {
    if (!route.params?.openEdit) {
      return;
    }
    setEditOpen(true);
    navigation.setParams({ openEdit: undefined });
  }, [navigation, route.params?.openEdit]);

  useEffect(() => {
    if (!authProfile?.uid) {
      setLiveProfile(null);
      return;
    }
    const unsubscribe = subscribeUserProfile(
      authProfile.uid,
      (next) => {
        setLiveProfile(next);
      },
      (error) => {
        console.warn("Profile live subscription failed:", error);
      },
    );
    return unsubscribe;
  }, [authProfile?.uid]);

  useEffect(() => {
    xpFill.value = withTiming(xpProgress.progress, { duration: xpFillDuration });
  }, [xpFill, xpFillDuration, xpProgress.progress]);

  useEffect(() => {
    if (!profile?.uid) {
      setDuelStats({ wins: 0, losses: 0 });
      return;
    }
    let active = true;
    void fetchUserDuelStats(profile.uid)
      .then((stats) => {
        if (active) {
          setDuelStats({ wins: stats.wins, losses: stats.losses });
        }
      })
      .catch((error) => {
        console.warn("Duel stats load failed:", error);
      });
    return () => {
      active = false;
    };
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.uid || !profile.chapterId) {
      setDuesStatus(null);
      return;
    }
    let active = true;
    void Promise.all([
      fetchMemberDuesStatus(profile.chapterId, profile.uid),
      fetchChapterDuesSettings(profile.chapterId),
    ])
      .then(([row, settings]) => {
        if (active) {
          setDuesStatus(
            row
              ? {
                  paid: row.paid,
                  deadline: settings.deadline,
                  paymentLink: settings.paymentLink,
                }
              : null,
          );
        }
      })
      .catch((error) => {
        console.warn("Dues status load failed:", error);
      });
    return () => {
      active = false;
    };
  }, [profile?.chapterId, profile?.uid]);


  const refresh = async () => {
    if (!profile) {
      return;
    }

    setRefreshing(true);
    try {
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
    setEditOfficerPosition(profile.officerPosition ?? "Member");
    setEditChapterRoles(profile.chapterRoles ?? []);
    setEditYearsServed(profile.yearsServed ?? "");
    setEditSchoolName(profile.schoolName ?? "");
    setEditSchoolCity(profile.schoolCity ?? "");
    setEditSchoolState(profile.state ?? "");
    setEditCompetitiveEvents(profile.competitiveEvents ?? []);
    setEditPlacements(profile.placements ?? []);
    setEditRoleExperiences(profile.roleExperiences ?? []);

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

  useEffect(() => {
    const queryValue = schoolQuery.trim();
    if (queryValue.length < 2) {
      setSchoolResults([]);
      setSchoolLoading(false);
      setSchoolError("");
      return;
    }
    const timer = setTimeout(() => {
      void (async () => {
        try {
          setSchoolLoading(true);
          setSchoolError("");
          const next = await searchSchools(queryValue);
          setSchoolResults(next);
        } catch (error) {
          console.warn("School search failed:", error);
          setSchoolResults([]);
          setSchoolError("Could not load schools, try again.");
        } finally {
          setSchoolLoading(false);
        }
      })();
    }, 300);

    return () => clearTimeout(timer);
  }, [schoolQuery, schoolRetryTick]);

  const toggleSection = (section: EditSectionKey) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleChapterRole = (role: ChapterRole) => {
    setEditChapterRoles((prev) =>
      prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role],
    );
  };

  const addCompetitiveEvent = (eventName: string) => {
    setMaxEventsError(false);
    setEditCompetitiveEvents((prev) => {
      if (prev.includes(eventName)) {
        return prev;
      }
      if (prev.length >= 3) {
        setMaxEventsError(true);
        return prev;
      }
      return [...prev, eventName];
    });
  };

  const removeCompetitiveEvent = (eventName: string) => {
    setEditCompetitiveEvents((prev) => prev.filter((item) => item !== eventName));
    setMaxEventsError(false);
  };

  const addPlacement = () => {
    const eventName = newPlacementEvent.trim();
    const yearValue = Number(newPlacementYear);
    if (!eventName || !Number.isFinite(yearValue)) {
      return;
    }
    const placement: UserPlacement = {
      id: `${eventName}-${newPlacementLevel}-${yearValue}-${Date.now().toString(36)}`,
      eventName,
      place: newPlacementPlace,
      competitionLevel: newPlacementLevel,
      year: yearValue,
    };
    setEditPlacements((prev) => [placement, ...prev]);
    setNewPlacementEvent("");
    setPlacementSearch("");
  };

  const addRoleExperience = () => {
    const next = roleExperienceInput.trim();
    if (!next) {
      return;
    }
    if (editRoleExperiences.includes(next)) {
      setRoleExperienceInput("");
      return;
    }
    setEditRoleExperiences((prev) => [next, ...prev]);
    setRoleExperienceInput("");
  };

  const removeRoleExperience = (value: string) => {
    setEditRoleExperiences((prev) => prev.filter((item) => item !== value));
  };

  const renderEditSection = (key: EditSectionKey, title: string, body: React.ReactNode) => {
    const expanded = expandedSections[key];
    return (
      <GlassSurface style={{ padding: 12, marginBottom: 10, borderRadius: 16 }}>
        <Pressable
          onPress={() => {
            hapticTap();
            toggleSection(key);
          }}
          style={{ minHeight: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        >
          <Text style={{ color: palette.colors.textSecondary, fontWeight: "700", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>
            {title}
          </Text>
          <ChevronDown
            size={18}
            color={palette.colors.textSecondary}
            style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
          />
        </Pressable>
        {expanded ? (
          <>
            <View style={{ height: 1, backgroundColor: palette.colors.border, marginBottom: 12 }} />
            <View style={{ gap: 10 }}>{body}</View>
          </>
        ) : null}
      </GlassSurface>
    );
  };

  if (!profile) {
    return (
      <ScreenShell title="Profile" subtitle="Loading profile..." showBackButton>
        <EmptyState title="Loading" message="Fetching your profile..." />
      </ScreenShell>
    );
  }

  const followers = profile.followerIds.map((id) => usersById.get(id)).filter(Boolean) as UserProfile[];
  const following = profile.followingIds.map((id) => usersById.get(id)).filter(Boolean) as UserProfile[];

  const statList: Array<{
    id: string;
    title: string;
    subtitle: string;
    avatarUrl?: string;
    tier?: UserProfile["tier"];
  }> =
    statSheet === "posts"
      ? posts.map((post) => ({ id: post.id, title: post.content, subtitle: `${formatCompactNumber(post.likeCount)} likes` }))
      : (statSheet === "followers" ? followers : following).map((user) => ({
          id: user.uid,
          title: user.displayName,
          subtitle: `${user.grade}th grade`,
          avatarUrl: user.avatarUrl,
          tier: user.tier,
        }));

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    if (!q) {
      return FBLA_COMPETITIVE_EVENTS;
    }
    return FBLA_COMPETITIVE_EVENTS.filter((item) => item.toLowerCase().includes(q));
  }, [eventSearch]);

  const filteredPlacementEvents = useMemo(() => {
    const q = placementSearch.trim().toLowerCase();
    if (!q) {
      return FBLA_COMPETITIVE_EVENTS.slice(0, 50);
    }
    return FBLA_COMPETITIVE_EVENTS.filter((item) => item.toLowerCase().includes(q)).slice(0, 50);
  }, [placementSearch]);

  const handleShareProfile = async () => {
    try {
      if (!shareCardRef.current) {
        await Share.share({ message: "Check out my FBLA Atlas profile!" });
        return;
      }
      const uri = await captureRef(shareCardRef.current, {
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

  const applyAvatarUri = async (localUri: string) => {
    if (!localUri) {
      return;
    }
    setUploadingAvatar(true);
    try {
      await uploadProfileAvatar(profile.uid, localUri);
      hapticSuccess();
    } catch (error) {
      console.warn("Avatar upload failed:", error);
      Alert.alert("Avatar Upload Failed", "We could not upload that image. Try another photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Needed", "Allow photo library access to set your profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) {
      return;
    }
    const asset = result.assets?.[0];
    if (asset?.uri) {
      await applyAvatarUri(asset.uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Needed", "Allow camera access to take a profile photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) {
      return;
    }
    const asset = result.assets?.[0];
    if (asset?.uri) {
      await applyAvatarUri(asset.uri);
    }
  };

  const resetToInitialsAvatar = async () => {
    setUploadingAvatar(true);
    try {
      await clearProfileAvatar(profile.uid);
      hapticSuccess();
    } catch (error) {
      console.warn("Reset avatar failed:", error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <ScreenShell
      title="Profile"
      subtitle="Your XP, streaks, badges, and account controls."
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      showBackButton
    >
      <View style={{ paddingTop: 8, position: "relative" }}>
        <LinearGradient
          pointerEvents="none"
          colors={[palette.colors.accentMuted, palette.colors.transparent]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: "absolute",
            top: -18,
            left: 30,
            right: 30,
            height: 170,
            borderRadius: 999,
            opacity: palette.isDark ? 0.14 : 0.07,
          }}
        />
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <AvatarWithStatus
            uri={profile.avatarUrl}
            seed={profile.displayName}
            size={88}
            online
            tier={profile.tier}
            avatarColor={profile.avatarColor || undefined}
          />
          {/* Color picker — only shown when no photo */}
          {(!profile.avatarUrl || profile.avatarUrl.trim().length === 0) ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {AVATAR_COLORS.map((color) => (
                <Pressable
                  key={color}
                  onPress={async () => {
                    hapticTap();
                    try {
                      await updateUserProfileFields(profile.uid, { avatarColor: color });
                    } catch (error) {
                      console.warn("Avatar color update failed:", error);
                    }
                  }}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: color,
                    borderWidth: profile.avatarColor === color ? 3 : 1,
                    borderColor: profile.avatarColor === color ? palette.colors.text : "transparent",
                  }}
                />
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 12, gap: 8 }}>
            <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 22 }}>{profile.displayName}</Text>
            <TierBadge tier={profile.tier} />
          </View>
          {profile.officerPosition && profile.officerPosition !== "Member" ? (
            <View
              style={{
                marginTop: 8,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 5,
                backgroundColor: palette.colors.inputSurface,
                borderWidth: 1,
                borderColor: palette.colors.border,
              }}
            >
              <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                {profile.officerPosition}
              </Text>
            </View>
          ) : null}
          {profile.schoolName ? (
            <Text style={{ marginTop: 6, color: palette.colors.textSecondary }}>
              {profile.schoolName}
            </Text>
          ) : null}
          {!profile.chapterId ? (
            <GlassButton
              variant="ghost"
              label="Join Chapter"
              fullWidth={false}
              style={{ marginTop: 10 }}
              onPress={() => navigation.navigate("JoinChapter")}
            />
          ) : (
            <Text style={{ marginTop: 6, color: palette.colors.textSecondary }}>
              {profile.chapterName ?? "Chapter Member"}
            </Text>
          )}
          {profile.competitiveEvents && profile.competitiveEvents.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, marginTop: 10 }}
            >
              {profile.competitiveEvents.map((eventName, index) => (
                <View
                  key={`${eventName}-${index}`}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    backgroundColor: palette.colors.inputSurface,
                    borderWidth: 1,
                    borderColor: palette.colors.border,
                  }}
                >
                  <Text style={{ color: palette.colors.text, fontSize: 12 }}>{eventName}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>

        <GlassSurface
          style={{
            padding: 10,
            marginBottom: 16,
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
              <Text style={{ color: palette.colors.text, fontWeight: "800" }}>{formatCompactNumber(posts.length)}</Text>
              <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>Posts</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                hapticTap();
                setStatSheet("followers");
              }}
              style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: palette.colors.text, fontWeight: "800" }}>{formatCompactNumber(profile.followerIds.length)}</Text>
              <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>Followers</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                hapticTap();
                setStatSheet("following");
              }}
              style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: palette.colors.text, fontWeight: "800" }}>{formatCompactNumber(profile.followingIds.length)}</Text>
              <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>Following</Text>
            </Pressable>
          </View>
        </GlassSurface>
      </View>

      <GlassSurface
        style={{
          padding: 12,
          marginBottom: 16,
          backgroundColor: palette.colors.glass,
          borderColor: palette.colors.glassBorder,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ fontWeight: "800", color: palette.colors.text }}>
            XP {formatCompactNumber(profile.xp)}
          </Text>
          <Text style={{ color: palette.colors.textSecondary }}>
            {xpProgress.next
              ? `${formatCompactNumber(xpWithinTier)} / ${formatCompactNumber(xpTierSpan)}`
              : "MAX TIER"}
          </Text>
        </View>
        <View style={{ height: 12, borderRadius: 999, backgroundColor: palette.colors.inputMuted, overflow: "hidden" }}>
          <Animated.View
            style={[
              {
                height: 12,
                borderRadius: 999,
                overflow: "hidden",
              },
              xpFillStyle,
            ]}
          >
            <LinearGradient
              colors={[tierColor, lightenHex(tierColor, 0.15)]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
          {colorBlindMode !== "none" ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                flexDirection: "row",
              }}
            >
              {Array.from({ length: 24 }).map((_, index) => (
                <View
                  // eslint-disable-next-line react/no-array-index-key
                  key={`xp_pattern_${index}`}
                  style={{
                    width: 4,
                    marginRight: 3,
                    backgroundColor: index % 2 === 0 ? palette.colors.background : "transparent",
                    opacity: 0.22,
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>
      </GlassSurface>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <GlassSurface style={{ flex: 1, padding: 12 }}>
          <Text style={{ color: palette.colors.text, fontWeight: "800" }}>Challenge Record</Text>
          <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
            {duelStats.wins}W - {duelStats.losses}L
          </Text>
        </GlassSurface>
        <GlassSurface style={{ flex: 1, padding: 12 }}>
          <Text style={{ color: palette.colors.text, fontWeight: "800" }}>Chapter Status</Text>
          {duesStatus ? (
            <>
              <Text style={{ color: duesStatus.paid ? palette.colors.success : palette.colors.warning, marginTop: 4 }}>
                {duesStatus.paid ? "Dues Paid" : "Dues Unpaid"}
              </Text>
              {duesStatus.deadline ? (
                <Text style={{ color: palette.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                  Deadline: {duesStatus.deadline}
                </Text>
              ) : null}
              {!duesStatus.paid && duesStatus.paymentLink ? (
                <Pressable
                  onPress={() => {
                    void Linking.openURL(duesStatus.paymentLink).catch(() => undefined);
                  }}
                  style={{ marginTop: 4 }}
                >
                  <Text style={{ color: palette.colors.primary, fontWeight: "700" }}>Pay Now</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>No dues info</Text>
          )}
        </GlassSurface>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <GlassButton
          variant="ghost"
          label="Edit Profile"
          style={{ flex: 1 }}
          onPress={() => {
            hapticTap();
            setEditOpen(true);
          }}
        />
        <GlassButton
          variant="ghost"
          label="Share Profile"
          style={{ flex: 1 }}
          onPress={() => {
            hapticTap();
            void handleShareProfile();
          }}
        />
      </View>

      <GlassButton
        variant="solid"
        label="Invite Friends"
        style={{ marginBottom: 16 }}
        onPress={() => {
          hapticTap();
          void Share.share({
            message: "Join me on FBLA Atlas! Track events, XP tiers, and campus updates together.",
          });
        }}
      />

      <GlassSurface style={{ marginBottom: 16, padding: 12 }}>
        <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>
          Badges
        </Text>
        {profile.badges.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {profile.badges.map((badge, index) => (
              <Badge key={`${badge}-${index}`} variant="gray-subtle" size="sm" capitalize={false}>
                {badge}
              </Badge>
            ))}
          </ScrollView>
        ) : (
          <EmptyState title="No Badges Yet" message="Keep engaging to unlock milestone badges." />
        )}
      </GlassSurface>

      <GlassSurface style={{ marginBottom: 16, padding: 12 }}>
        <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>
          Achievements
        </Text>
        {profile.placements && profile.placements.length > 0 ? (
          profile.placements.map((placement, index) => (
            <View
              key={`${placement.id}_${index}`}
              style={{
                borderBottomWidth: 1,
                borderBottomColor: palette.colors.divider,
                paddingBottom: 8,
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: placementBadgeColor(placement.place) }} />
                <Text style={{ color: palette.colors.text, fontWeight: "700", flex: 1 }}>
                  {placement.place} — {placement.eventName}
                </Text>
              </View>
              <Text style={{ color: palette.colors.textSecondary }}>
                {placement.competitionLevel} {placement.year}
              </Text>
              <GlassButton
                variant="ghost"
                size="sm"
                label="Submit to Recognition Wall"
                style={{ marginTop: 6, alignSelf: "flex-start" }}
                onPress={async () => {
                  try {
                    await submitPlacementToRecognitionWall(profile, {
                      eventName: placement.eventName,
                      place: placement.place,
                      level: placement.competitionLevel,
                      year: placement.year,
                    });
                  } catch (error) {
                    console.warn("Placement submit failed:", error);
                  }
                }}
              />
            </View>
          ))
        ) : (
          <Text style={{ color: palette.colors.textSecondary }}>No placements added yet.</Text>
        )}
      </GlassSurface>

      <GlassSurface style={{ marginBottom: 16, padding: 12 }}>
        <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>
          FBLA Journey
        </Text>
        {(profile.milestones ?? []).length > 0 ? (
          (profile.milestones ?? []).slice(0, 8).map((milestone, index, list) => (
            <View
              key={`${milestone.id}_${index}`}
              style={{
                flexDirection: "row",
                gap: 10,
                paddingBottom: 10,
                marginBottom: 10,
                borderBottomWidth: index === list.length - 1 ? 0 : 1,
                borderBottomColor: palette.colors.divider,
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  marginTop: 6,
                  borderRadius: 5,
                  backgroundColor: palette.colors.primary,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                  {milestone.description}
                </Text>
                <Text style={{ color: palette.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {formatRelativeDateTime(milestone.date)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={{ color: palette.colors.textSecondary }}>
            Your milestones will appear here as you practice, post, and level up.
          </Text>
        )}
      </GlassSurface>

      <GlassSurface style={{ padding: 12, marginBottom: 16 }}>
        <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>
          Recent Activity
        </Text>
        {activity.length > 0 ? (
          activity.map((item, index) => (
            <View
              key={`${item.id}_${index}`}
              style={{
                borderBottomWidth: 1,
                borderBottomColor: palette.colors.divider,
                paddingBottom: 8,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: palette.colors.text }}>{item.message}</Text>
              <Text style={{ color: palette.colors.onImageMuted, fontSize: 12 }}>
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
              {/* Drag handle */}
              <View style={{ alignItems: "center", marginBottom: 12, marginTop: -4 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.colors.border }} />
              </View>
              <Text variant="titleLarge" style={{ fontWeight: "900", marginBottom: 10 }}>
                {statSheet === "posts" ? "Posts" : statSheet === "followers" ? "Followers" : "Following"}
              </Text>
              <ScrollView contentContainerStyle={{ gap: 8 }}>
                {statList.length > 0 ? (
                  statList.map((row, index) => (
                    <View key={`${row.id}_${index}`} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}>
                      {row.avatarUrl ? (
                        <AvatarWithStatus uri={row.avatarUrl} size={32} online tier={row.tier} />
                      ) : null}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ fontWeight: "800" }} numberOfLines={2}>
                            {row.title}
                          </Text>
                          {row.tier ? <TierBadge tier={row.tier} /> : null}
                        </View>
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
            <View style={{ backgroundColor: palette.colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "92%", flex: 0 }}>
              {/* Drag handle */}
              <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 2 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.colors.border }} />
              </View>
              {/* Fixed header — title only */}
              <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
                <Text variant="titleLarge" style={{ fontWeight: "900" }}>Edit Profile</Text>
              </View>

              {/* All content scrolls */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}
              >
              {/* Avatar section */}
              <GlassSurface style={{ padding: 12 }}>
                <Text style={{ color: palette.colors.textSecondary, fontWeight: "700", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                  Profile Photo
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                  <GlassButton
                    variant="ghost"
                    label={uploadingAvatar ? "Uploading..." : "Camera Roll"}
                    style={{ flex: 1 }}
                    disabled={uploadingAvatar}
                    onPress={() => { void pickFromLibrary(); }}
                  />
                  <GlassButton
                    variant="ghost"
                    label="Take Photo"
                    style={{ flex: 1 }}
                    disabled={uploadingAvatar}
                    onPress={() => { void takePhoto(); }}
                  />
                </View>
                <GlassButton
                  variant="ghost"
                  label="Use Initials Avatar"
                  disabled={uploadingAvatar}
                  onPress={() => { void resetToInitialsAvatar(); }}
                />
                {/* Color picker — always shown so users can customize */}
                <View style={{ marginTop: 10 }}>
                  <Text style={{ color: palette.colors.textSecondary, fontWeight: "700", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                    Avatar Color
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    {AVATAR_COLORS.map((color) => (
                      <Pressable
                        key={color}
                        onPress={async () => {
                          hapticTap();
                          try {
                            await updateUserProfileFields(profile.uid, { avatarColor: color });
                          } catch (error) {
                            console.warn("Avatar color update failed:", error);
                          }
                        }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: color,
                          borderWidth: profile.avatarColor === color ? 3 : 1.5,
                          borderColor: profile.avatarColor === color ? palette.colors.text : "transparent",
                        }}
                      />
                    ))}
                  </View>
                </View>
              </GlassSurface>

              {/* Display Name */}
              <GlassSurface style={{ padding: 12 }}>
                <Text style={{ color: palette.colors.textSecondary, fontWeight: "700", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                  Display Name
                </Text>
                <GlassInput value={editName} onChangeText={setEditName} placeholder="Your name" />
              </GlassSurface>

                {renderEditSection(
                  "role",
                  "FBLA ROLE & POSITION",
                  <>
                    <GlassDropdown
                      label="Officer Position"
                      value={editOfficerPosition}
                      options={OFFICER_POSITIONS.map((position) => ({ label: position, value: position }))}
                      onValueChange={(value) => {
                        if (OFFICER_POSITIONS.includes(value as OfficerPosition)) {
                          setEditOfficerPosition(value as OfficerPosition);
                        }
                      }}
                    />
                    <Text style={{ color: palette.colors.textSecondary, fontWeight: "700", fontSize: 12 }}>
                      Chapter Role
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {CHAPTER_ROLE_OPTIONS.map((roleOption) => {
                        const active = editChapterRoles.includes(roleOption);
                        return (
                          <Pressable
                            key={roleOption}
                            onPress={() => toggleChapterRole(roleOption)}
                            style={{
                              borderRadius: 999,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderWidth: 1,
                              borderColor: active ? palette.colors.primary : palette.colors.border,
                              backgroundColor: active ? palette.colors.inputSurface : palette.colors.surface,
                            }}
                          >
                            <Text style={{ color: palette.colors.text, fontSize: 12 }}>{roleOption}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {editChapterRoles.length > 0 ? (
                      <GlassInput
                        value={editYearsServed}
                        onChangeText={setEditYearsServed}
                        label="Year(s) Served"
                        placeholder="e.g. 2024-2026"
                      />
                    ) : null}
                  </>,
                )}

                {renderEditSection(
                  "school",
                  "SCHOOL",
                  <>
                    {editSchoolName ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          borderRadius: 999,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderWidth: 1,
                          borderColor: palette.colors.border,
                          backgroundColor: palette.colors.inputSurface,
                        }}
                      >
                        <Text style={{ color: palette.colors.text, flex: 1 }}>
                          {editSchoolName}
                          {editSchoolState ? ` (${editSchoolState})` : ""}
                        </Text>
                        <Pressable
                          onPress={() => {
                            setEditSchoolName("");
                            setEditSchoolCity("");
                            setEditSchoolState("");
                          }}
                          style={{ minHeight: 28, minWidth: 28, alignItems: "center", justifyContent: "center" }}
                        >
                          <X size={16} color={palette.colors.textSecondary} />
                        </Pressable>
                      </View>
                    ) : null}

                    <GlassInput
                      value={schoolQuery}
                      onChangeText={setSchoolQuery}
                      label="Search School"
                      placeholder="Type school name"
                      leftSlot={<Search size={16} color={palette.colors.textSecondary} />}
                    />
                    {schoolLoading ? (
                      <Text style={{ color: palette.colors.textSecondary }}>Searching schools...</Text>
                    ) : null}
                    {schoolError ? (
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <Text style={{ color: palette.colors.danger, flex: 1 }}>{schoolError}</Text>
                        <GlassButton
                          variant="ghost"
                          size="sm"
                          label="Retry"
                          fullWidth={false}
                          onPress={() => setSchoolRetryTick((prev) => prev + 1)}
                        />
                      </View>
                    ) : null}
                    {schoolResults.length > 0 ? (
                      <GlassSurface style={{ padding: 8, maxHeight: 180 }}>
                        <ScrollView keyboardShouldPersistTaps="handled">
                          {schoolResults.map((school) => (
                            <Pressable
                              key={`${school.name}-${school.state}-${school.city}`}
                              onPress={() => {
                                setEditSchoolName(school.name);
                                setEditSchoolCity(school.city);
                                setEditSchoolState(school.state);
                                setSchoolQuery("");
                                setSchoolResults([]);
                              }}
                              style={{
                                paddingVertical: 8,
                                borderBottomWidth: 1,
                                borderBottomColor: palette.colors.divider,
                              }}
                            >
                              <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{formatSchoolLabel(school)}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </GlassSurface>
                    ) : null}
                  </>,
                )}

                {renderEditSection(
                  "events",
                  "COMPETITIVE EVENTS",
                  <>
                    {editCompetitiveEvents.length > 0 ? (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {editCompetitiveEvents.map((eventName, index) => (
                          <View
                            key={`${eventName}-${index}`}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              borderRadius: 999,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderWidth: 1,
                              borderColor: palette.colors.border,
                              backgroundColor: palette.colors.inputSurface,
                            }}
                          >
                            <Text style={{ color: palette.colors.text, fontSize: 12 }}>{eventName}</Text>
                            <Pressable onPress={() => removeCompetitiveEvent(eventName)}>
                              <X size={14} color={palette.colors.textSecondary} />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    <GlassInput
                      value={eventSearch}
                      onChangeText={setEventSearch}
                      label="Search Events"
                      placeholder="Filter FBLA events"
                    />
                    {maxEventsError ? (
                      <View
                        style={{
                          borderRadius: 999,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          backgroundColor: palette.colors.inputSurface,
                          alignSelf: "flex-start",
                        }}
                      >
                        <Text style={{ color: palette.colors.danger, fontWeight: "700" }}>Max 3 events</Text>
                      </View>
                    ) : null}
                    <GlassSurface style={{ padding: 8, maxHeight: 180 }}>
                      <ScrollView>
                        {filteredEvents.map((eventName, index) => (
                          <Pressable
                            key={`${eventName}-${index}`}
                            onPress={() => addCompetitiveEvent(eventName)}
                            style={{
                              minHeight: 44,
                              justifyContent: "center",
                              borderBottomWidth: 1,
                              borderBottomColor: palette.colors.divider,
                            }}
                          >
                            <Text style={{ color: palette.colors.text }}>{eventName}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </GlassSurface>
                  </>,
                )}

                {renderEditSection(
                  "achievements",
                  "QUALIFICATIONS & ACHIEVEMENTS",
                  <>
                    <Text style={{ color: palette.colors.textSecondary, fontWeight: "700", fontSize: 12 }}>
                      Add Placement
                    </Text>
                    <GlassInput
                      value={placementSearch}
                      onChangeText={setPlacementSearch}
                      label="Event Search"
                      placeholder="Search event for placement"
                    />
                    <GlassSurface style={{ padding: 8, maxHeight: 140 }}>
                      <ScrollView>
                        {filteredPlacementEvents.slice(0, 25).map((eventName, index) => (
                          <Pressable
                            key={`${eventName}-${index}`}
                            onPress={() => {
                              setNewPlacementEvent(eventName);
                              setPlacementSearch(eventName);
                            }}
                            style={{
                              minHeight: 40,
                              justifyContent: "center",
                              borderBottomWidth: 1,
                              borderBottomColor: palette.colors.divider,
                            }}
                          >
                            <Text style={{ color: palette.colors.text }}>{eventName}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </GlassSurface>
                    <GlassInput
                      value={newPlacementEvent}
                      onChangeText={setNewPlacementEvent}
                      label="Selected Event"
                      placeholder="Business Law"
                    />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <GlassDropdown
                        style={{ flex: 1 }}
                        label="Place"
                        value={newPlacementPlace}
                        options={PLACEMENT_OPTIONS.map((place) => ({ label: place, value: place }))}
                        onValueChange={(value) => {
                          if (PLACEMENT_OPTIONS.includes(value as PlacementResult)) {
                            setNewPlacementPlace(value as PlacementResult);
                          }
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: palette.colors.textSecondary, fontWeight: "700", fontSize: 12, marginBottom: 6 }}>
                          Level
                        </Text>
                        <GlassSegmentedControl
                          value={newPlacementLevel}
                          options={LEVEL_OPTIONS.map((level) => ({ label: level, value: level }))}
                          onValueChange={(value) => {
                            if (LEVEL_OPTIONS.includes(value as PlacementLevel)) {
                              setNewPlacementLevel(value as PlacementLevel);
                            }
                          }}
                          size="sm"
                        />
                      </View>
                    </View>
                    <GlassInput
                      value={newPlacementYear}
                      onChangeText={setNewPlacementYear}
                      keyboardType="numeric"
                      label="Year"
                      placeholder="2024"
                    />
                    <GlassButton
                      variant="ghost"
                      label="Add Placement"
                      icon={<Plus size={16} color={palette.colors.text} />}
                      onPress={addPlacement}
                    />

                    {editPlacements.map((placement, index) => (
                      <Swipeable
                        key={`${placement.id}_${index}`}
                        renderRightActions={() => (
                          <View
                            style={{
                              justifyContent: "center",
                              alignItems: "center",
                              backgroundColor: palette.colors.inputSurface,
                              paddingHorizontal: 14,
                              borderRadius: 12,
                              marginBottom: 8,
                            }}
                          >
                            <Text style={{ color: palette.colors.danger, fontWeight: "800" }}>Delete</Text>
                          </View>
                        )}
                        onSwipeableOpen={() => {
                          setEditPlacements((prev) => prev.filter((item) => item.id !== placement.id));
                        }}
                      >
                        <GlassSurface style={{ padding: 10, marginBottom: 8 }}>
                          <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                            {placement.place} Place - {placement.eventName} - {placement.competitionLevel} {placement.year}
                          </Text>
                        </GlassSurface>
                      </Swipeable>
                    ))}

                    <Text style={{ color: palette.colors.textSecondary, fontWeight: "700", fontSize: 12 }}>
                      Add Role/Experience
                    </Text>
                    <GlassInput
                      value={roleExperienceInput}
                      onChangeText={setRoleExperienceInput}
                      label="Role/Experience"
                      placeholder="Conference volunteer"
                    />
                    <GlassButton
                      variant="ghost"
                      label="Add Role/Experience"
                      icon={<Plus size={16} color={palette.colors.text} />}
                      onPress={addRoleExperience}
                    />
                    {editRoleExperiences.length > 0 ? (
                      <View style={{ gap: 6 }}>
                        {editRoleExperiences.map((entry, index) => (
                          <GlassSurface key={`${entry}-${index}`} style={{ padding: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <Text style={{ color: palette.colors.text }}>{entry}</Text>
                            <Pressable onPress={() => removeRoleExperience(entry)}>
                              <X size={16} color={palette.colors.textSecondary} />
                            </Pressable>
                          </GlassSurface>
                        ))}
                      </View>
                    ) : null}
                  </>,
                )}

                {renderEditSection(
                  "bio",
                  "BIO",
                  <>
                    <GlassInput
                      label="Bio"
                      value={editBio}
                      onChangeText={(value) => {
                        if (value.length <= 150) {
                          setEditBio(value);
                        }
                      }}
                      multiline
                      placeholder="Tell your chapter about yourself..."
                      inputWrapperStyle={{ borderRadius: 18, minHeight: 110 }}
                    />
                    <Text style={{ alignSelf: "flex-end", color: palette.colors.textSecondary }}>
                      {editBio.length}/150
                    </Text>
                  </>,
                )}
              <GlassButton
                variant="solid"
                label={savingEdit ? "Saving..." : "Save Changes"}
                loading={savingEdit}
                disabled={!editName.trim() || savingEdit}
                onPress={async () => {
                  setSavingEdit(true);
                  try {
                    const hadCompletedProfile =
                      Boolean(profile.bio?.trim()) &&
                      Boolean(profile.schoolName?.trim()) &&
                      Array.isArray(profile.competitiveEvents) &&
                      profile.competitiveEvents.length > 0;
                    await updateUserProfileFields(profile.uid, {
                      displayName: editName.trim(),
                      bio: editBio.trim(),
                      officerPosition: editOfficerPosition,
                      chapterRoles: editChapterRoles,
                      yearsServed: editChapterRoles.length > 0 ? editYearsServed.trim() : "",
                      schoolName: editSchoolName.trim() || profile.schoolName,
                      schoolCity: editSchoolCity.trim(),
                      state: editSchoolState.trim() || profile.state,
                      competitiveEvents: editCompetitiveEvents,
                      placements: editPlacements,
                      roleExperiences: editRoleExperiences,
                    });
                    const completedAfterSave =
                      Boolean(editBio.trim()) &&
                      Boolean((editSchoolName.trim() || profile.schoolName || "").trim()) &&
                      editCompetitiveEvents.length > 0;
                    if (!hadCompletedProfile && completedAfterSave && !profileCompletionAwarded) {
                      const completionAward = await awardPointsToUser(
                        profile.uid,
                        "profile_completed_bonus",
                      );
                      handleAwardResult(completionAward, {
                        customMessage: `+${completionAward.pointsAwarded} XP - Profile completed!`,
                      });
                      setProfileCompletionAwarded(true);
                    }
                    hapticSuccess();
                    setEditOpen(false);
                  } catch (error) {
                    console.warn("Save profile edit failed:", error);
                  } finally {
                    setSavingEdit(false);
                  }
                }}
              />
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={{ position: "absolute", left: -1000, top: -1000 }}>
        <ViewShot ref={shareCardRef} options={{ format: "png", quality: 1 }}>
          <View style={{ width: 360, backgroundColor: palette.colors.background, borderRadius: 18, padding: 16 }}>
            <Text style={{ color: palette.colors.onImageText, fontSize: 24, fontWeight: "900" }}>FBLA Atlas</Text>
            <Text style={{ color: palette.colors.secondary, marginTop: 4 }}>{profile.schoolName}</Text>
            <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <AvatarWithStatus
                uri={profile.avatarUrl}
                seed={profile.displayName}
                size={62}
                online={false}
                tier={profile.tier}
                avatarColor={profile.avatarColor || undefined}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.colors.onImageText, fontWeight: "900", fontSize: 18 }}>{profile.displayName}</Text>
                <Text style={{ color: palette.colors.textSecondary }}>
                  {formatCompactNumber(profile.xp)} XP
                </Text>
              </View>
            </View>
            <Text style={{ color: palette.colors.textSecondary, marginTop: 12 }}>Top Badges</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              {profile.badges.slice(0, 3).map((badge, index) => (
                <View
                  key={`${badge}-${index}`}
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

      <GlassButton
        variant="ghost"
        label="View Leaderboard"
        style={{ marginTop: 0 }}
        onPress={() => navigation.navigate("Leaderboard")}
      />
    </ScreenShell>
  );
}







