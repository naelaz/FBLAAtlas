import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { Shield } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassDropdown } from "../components/ui/GlassDropdown";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSurface } from "../components/ui/GlassSurface";
import { db } from "../config/firebase";
import { getTierForXp } from "../constants/gamification";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { usePermissions } from "../hooks/usePermissions";
import { RootStackParamList } from "../navigation/types";
import {
  approveChapterJoinRequest,
  ChapterJoinRequest,
  denyChapterJoinRequest,
  fetchPendingChapterJoinRequests,
  postAnnouncement,
} from "../services/chapterService";
import { toIso } from "../services/firestoreUtils";
import { hapticTap } from "../services/haptics";
import { SOCIAL_PLATFORM_META, upsertSocialFeedPost } from "../services/socialContentService";
import { fetchAllUsers } from "../services/userService";
import { UserProfile } from "../types/social";
import { verifyRecognitionPlacement, removeRecognitionPlacement, subscribeRecognitionPlacements } from "../services/recognitionService";
import { ChapterDuesSettings, DuesRecord, RecognitionPlacement } from "../types/features";
import { fetchChapterDuesSettings, setChapterDuesSettings, setMemberDuesPaid, subscribeChapterDuesStatus, markAllChapterMembersUnpaid } from "../services/duesService";
import { formatRelativeTime } from "../utils/format";

type ModerationPost = {
  id: string;
  content: string;
  authorName: string;
  timestamp: string;
  flagged: boolean;
};

type AdminStats = {
  totalUsers: number;
  activeToday: number;
  totalPosts: number;
  totalPracticeSessions: number;
  mostPracticedEvent: string;
};

function todayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AdminDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, refreshProfile } = useAuthContext();
  const { palette } = useThemeContext();
  const permissions = usePermissions();
  const canManageDues = permissions.canManageDues();

  const [queryText, setQueryText] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [xpAdjustments, setXpAdjustments] = useState<Record<string, string>>({});
  const [flaggedPosts, setFlaggedPosts] = useState<ModerationPost[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ChapterJoinRequest[]>([]);
  const [chapterUsers, setChapterUsers] = useState<UserProfile[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [socialPlatform, setSocialPlatform] = useState<"x" | "instagram" | "facebook" | "youtube" | "tiktok">("instagram");
  const [socialPostText, setSocialPostText] = useState("");
  const [socialPostUrl, setSocialPostUrl] = useState("");
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeToday: 0,
    totalPosts: 0,
    totalPracticeSessions: 0,
    mostPracticedEvent: "N/A",
  });
  const [busy, setBusy] = useState(false);
  const [placements, setPlacements] = useState<RecognitionPlacement[]>([]);
  const [duesRows, setDuesRows] = useState<DuesRecord[]>([]);
  const [duesSettings, setDuesSettings] = useState<ChapterDuesSettings>({ amount: 0, deadline: "", paymentLink: "" });

  const isAdmin = permissions.isAdmin;
  const isChapterOfficer = permissions.isOfficer;
  const canAccessDashboard = permissions.canAccessAdminDash() || permissions.isOfficer;

  const logAdminAction = useCallback(
    async (action: string, targetUid?: string) => {
      if (!profile) {
        return;
      }
      await setDoc(doc(collection(db, "adminLogs")), {
        adminUid: profile.uid,
        action,
        targetUid: targetUid ?? null,
        timestamp: serverTimestamp(),
      });
    },
    [profile],
  );

  const loadData = useCallback(async () => {
    if (!profile) {
      return;
    }
    setBusy(true);
    try {
      const [allUsers, requestRows] = await Promise.all([
        fetchAllUsers(),
        fetchPendingChapterJoinRequests(),
      ]);
      setUsers(allUsers);
      setPendingRequests(requestRows);
      const chapterScopedUsers = allUsers.filter(
        (user) =>
          (profile.chapterId && user.chapterId === profile.chapterId) || user.schoolId === profile.schoolId,
      );
      setChapterUsers(chapterScopedUsers.length > 0 ? chapterScopedUsers : allUsers.slice(0, 120));

      const today = todayKey();
      const active = allUsers.filter(
        (user) => (user.lastLoginDate ?? user.lastDailyLoginDate) === today,
      ).length;

      const postsSnap = await getDocs(
        query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(120)),
      ).catch(() => getDocs(query(collection(db, "posts"), limit(120))));
      const posts = postsSnap.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        return {
          id: docSnap.id,
          content: typeof data.content === "string" ? data.content : "",
          authorName: typeof data.authorName === "string" ? data.authorName : "Unknown",
          timestamp: toIso(data.createdAt),
          flagged: Boolean(data.flagged),
        } satisfies ModerationPost;
      });
      setFlaggedPosts(posts);

      let practiceDocs: Array<Record<string, unknown>> = [];
      try {
        const grouped = await getDocs(query(collectionGroup(db, "practiceHistory"), limit(1000)));
        practiceDocs = grouped.docs.map((docSnap) => docSnap.data() as Record<string, unknown>);
      } catch {
        const sessions = await getDocs(query(collection(db, "practiceSessions"), limit(1000)));
        practiceDocs = sessions.docs.map((docSnap) => docSnap.data() as Record<string, unknown>);
      }

      const eventCounts = new Map<string, number>();
      practiceDocs.forEach((item) => {
        const eventName =
          typeof item.eventName === "string"
            ? item.eventName
            : typeof item.eventId === "string"
              ? item.eventId
              : "";
        if (!eventName) {
          return;
        }
        eventCounts.set(eventName, (eventCounts.get(eventName) ?? 0) + 1);
      });
      const mostPracticedEvent = [...eventCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

      setStats({
        totalUsers: allUsers.length,
        activeToday: active,
        totalPosts: posts.length,
        totalPracticeSessions: practiceDocs.length,
        mostPracticedEvent,
      });
    } finally {
      setBusy(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) {
      return;
    }
    if (!canAccessDashboard) {
      Alert.alert("Access Denied", "Administrator or chapter officer access required.");
      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
      return;
    }
    void loadData();
  }, [canAccessDashboard, loadData, navigation, profile]);

  useEffect(() => {
    if (!profile?.schoolId) {
      return;
    }
    const unsub = subscribeRecognitionPlacements(profile.schoolId, (rows) => {
      setPlacements(rows);
    });
    return unsub;
  }, [profile?.schoolId]);

  useEffect(() => {
    if (!profile?.chapterId || !canManageDues) {
      return;
    }
    void fetchChapterDuesSettings(profile.chapterId).then(setDuesSettings).catch(() => undefined);
    const unsub = subscribeChapterDuesStatus(profile.chapterId, setDuesRows);
    return unsub;
  }, [canManageDues, profile?.chapterId]);

  const filteredUsers = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) {
      return users.slice(0, 50);
    }
    return users
      .filter((user) => {
        const byName = user.displayName.toLowerCase().includes(q);
        const bySchool = user.schoolName.toLowerCase().includes(q);
        return byName || bySchool;
      })
      .slice(0, 50);
  }, [queryText, users]);

  if (!profile) {
    return null;
  }

  return (
    <ScreenShell
      title="Admin Dashboard"
      subtitle={
        isAdmin
          ? "User management, moderation, announcements, and system stats."
          : "Chapter management and join request approvals."
      }
      showBackButton
      onBackPress={() => navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] })}
    >
      {isAdmin ? (
        <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Shield size={18} color={palette.colors.text} />
          <Text style={{ color: palette.colors.text, fontWeight: "800" }}>
            Administrator Access
          </Text>
        </View>
        </GlassSurface>
      ) : null}

      {permissions.canVerifyPlacements() ? (
        <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
          <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>
            Placements Verification
          </Text>
          {placements.length === 0 ? (
            <Text style={{ color: palette.colors.textSecondary }}>No placement submissions.</Text>
          ) : (
            placements.slice(0, 40).map((placement) => (
              <View
                key={placement.id}
                style={{
                  borderWidth: 1,
                  borderColor: palette.colors.border,
                  borderRadius: 12,
                  padding: 10,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                  {placement.userName} - {placement.place} - {placement.eventName}
                </Text>
                <Text style={{ color: palette.colors.textSecondary }}>
                  {placement.level} {placement.year} - {placement.verified ? "Verified" : "Pending"}
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  {!placement.verified ? (
                    <GlassButton
                      variant="solid"
                      label="Verify"
                      style={{ flex: 1 }}
                      onPress={async () => {
                        await verifyRecognitionPlacement(placement.id, profile?.uid ?? "");
                      }}
                    />
                  ) : null}
                  <GlassButton
                    variant="ghost"
                    label="Remove"
                    style={{ flex: 1 }}
                    onPress={async () => {
                      await removeRecognitionPlacement(placement.id);
                    }}
                  />
                </View>
              </View>
            ))
          )}
        </GlassSurface>
      ) : null}

      {isAdmin ? (
        <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
        <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>
          User Management
        </Text>
        <GlassInput
          value={queryText}
          onChangeText={setQueryText}
          placeholder="Search users by name"
          label="User Search"
        />
        <ScrollView style={{ maxHeight: 280, marginTop: 8 }} keyboardShouldPersistTaps="handled">
          {filteredUsers.map((user) => (
            <Pressable key={user.uid} onPress={() => setSelectedUser(user)} style={{ marginBottom: 8 }}>
              {({ pressed }) => (
                <GlassSurface
                  pressed={pressed}
                  style={{
                    borderWidth: 1,
                    borderColor: palette.colors.border,
                    borderRadius: 12,
                    padding: 10,
                  }}
                >
                  <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                    {user.displayName}
                  </Text>
                  <Text style={{ color: palette.colors.textSecondary }}>
                    XP: {user.xp} - {user.role === "admin" ? "Admin" : "Member"} -{" "}
                    {user.banned ? "Banned" : "Active"}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <GlassButton
                      variant="ghost"
                      label={user.banned ? "Unban" : "Ban"}
                      style={{ flex: 1 }}
                      onPress={async () => {
                        hapticTap();
                        await updateDoc(doc(db, "users", user.uid), {
                          banned: !user.banned,
                          updatedAt: serverTimestamp(),
                        });
                        await logAdminAction(user.banned ? "unban_user" : "ban_user", user.uid);
                        await loadData();
                      }}
                    />
                    <GlassInput
                      containerStyle={{ flex: 1 }}
                      value={xpAdjustments[user.uid] ?? ""}
                      onChangeText={(value) =>
                        setXpAdjustments((prev) => ({ ...prev, [user.uid]: value }))
                      }
                      placeholder="XP Total"
                      label="Set XP"
                      keyboardType="numeric"
                    />
                    <GlassButton
                      variant="solid"
                      label="Apply"
                      onPress={async () => {
                        const nextXp = Math.max(0, Number(xpAdjustments[user.uid] ?? "0"));
                        if (!Number.isFinite(nextXp)) {
                          return;
                        }
                        const tier = getTierForXp(nextXp).name;
                        hapticTap();
                        await updateDoc(doc(db, "users", user.uid), {
                          xp: nextXp,
                          tier,
                          updatedAt: serverTimestamp(),
                        });
                        await logAdminAction(`set_xp:${nextXp}`, user.uid);
                        setXpAdjustments((prev) => ({ ...prev, [user.uid]: "" }));
                        await loadData();
                      }}
                    />
                  </View>
                </GlassSurface>
              )}
            </Pressable>
          ))}
        </ScrollView>
        </GlassSurface>
      ) : null}

      {isAdmin ? (
        <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
        <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>
          Content Moderation
        </Text>
        {flaggedPosts.length === 0 ? (
          <Text style={{ color: palette.colors.textSecondary }}>No posts to moderate yet.</Text>
        ) : (
          flaggedPosts.map((post) => (
            <View
              key={post.id}
              style={{
                borderWidth: 1,
                borderColor: palette.colors.border,
                borderRadius: 12,
                padding: 10,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{post.authorName}</Text>
              <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }} numberOfLines={2}>
                {post.content}
              </Text>
              <Text style={{ color: palette.colors.textSecondary, marginTop: 4, fontSize: 12 }}>
                {formatRelativeTime(post.timestamp)}
              </Text>
              {post.flagged ? (
                <Text style={{ color: palette.colors.warning, marginTop: 2, fontSize: 12 }}>
                  Flagged by users
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <GlassButton
                  variant="solid"
                  label="Remove"
                  style={{ flex: 1 }}
                  onPress={async () => {
                    hapticTap();
                    await deleteDoc(doc(db, "posts", post.id));
                    await logAdminAction("remove_post", post.id);
                    await loadData();
                  }}
                />
                {post.flagged ? (
                  <GlassButton
                    variant="ghost"
                    label="Approve"
                    style={{ flex: 1 }}
                    onPress={async () => {
                      hapticTap();
                      await updateDoc(doc(db, "posts", post.id), {
                        flagged: false,
                        reviewedAt: serverTimestamp(),
                      });
                      await logAdminAction("approve_post", post.id);
                      await loadData();
                    }}
                  />
                ) : null}
              </View>
            </View>
          ))
        )}
        </GlassSurface>
      ) : null}

      {isAdmin ? (
        <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
        <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>
          Announcements
        </Text>
        <GlassInput
          value={announcement}
          onChangeText={setAnnouncement}
          multiline
          label="School-wide announcement"
          placeholder="Post an important update to all users."
          inputWrapperStyle={{ borderRadius: 16 }}
        />
        <GlassButton
          variant="solid"
          label="Post Announcement"
          style={{ marginTop: 8 }}
          disabled={!announcement.trim()}
          onPress={async () => {
            const body = announcement.trim();
            if (!body) {
              return;
            }
            hapticTap();
            await postAnnouncement(body, profile.displayName, profile.uid);
            await logAdminAction("post_announcement");
            setAnnouncement("");
            await loadData();
          }}
        />
        </GlassSurface>
      ) : null}

      {isAdmin ? (
        <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
          <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>
            Social Media Posts
          </Text>
          <GlassDropdown
            label="Platform"
            value={socialPlatform}
            options={(Object.keys(SOCIAL_PLATFORM_META) as Array<"x" | "instagram" | "facebook" | "youtube" | "tiktok">).map((platform) => ({
              value: platform,
              label: SOCIAL_PLATFORM_META[platform].name,
              description: SOCIAL_PLATFORM_META[platform].handle,
            }))}
            onValueChange={(value) => {
              if (
                value === "x" ||
                value === "instagram" ||
                value === "facebook" ||
                value === "youtube" ||
                value === "tiktok"
              ) {
                setSocialPlatform(value);
              }
            }}
            style={{ marginBottom: 8 }}
          />
          <GlassInput
            value={socialPostText}
            onChangeText={setSocialPostText}
            label="Post Preview Text"
            placeholder="Paste a short latest update for this platform."
            multiline
            inputWrapperStyle={{ borderRadius: 14 }}
          />
          <GlassInput
            value={socialPostUrl}
            onChangeText={setSocialPostUrl}
            label="Post URL (optional)"
            placeholder={SOCIAL_PLATFORM_META[socialPlatform].followUrl}
            containerStyle={{ marginTop: 8 }}
          />
          <GlassButton
            variant="solid"
            label="Save Social Post"
            style={{ marginTop: 8 }}
            disabled={!socialPostText.trim()}
            onPress={async () => {
              if (!socialPostText.trim()) {
                return;
              }
              hapticTap();
              await upsertSocialFeedPost(
                socialPlatform,
                socialPostText,
                socialPostUrl,
                profile.displayName,
              );
              await logAdminAction(`update_social_feed:${socialPlatform}`);
              setSocialPostText("");
              setSocialPostUrl("");
            }}
          />
        </GlassSurface>
      ) : null}

      <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
        <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>
          Chapter Management
        </Text>
        <Text style={{ color: palette.colors.textSecondary, marginBottom: 8 }}>
          Pending Join Requests
        </Text>
        {pendingRequests.length === 0 ? (
          <Text style={{ color: palette.colors.textSecondary, marginBottom: 12 }}>
            No pending requests.
          </Text>
        ) : (
          pendingRequests.map((request) => (
            <View
              key={`${request.chapterId}-${request.userId}`}
              style={{
                borderWidth: 1,
                borderColor: palette.colors.border,
                borderRadius: 12,
                padding: 10,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                {request.requesterName}
              </Text>
              <Text style={{ color: palette.colors.textSecondary }}>
                {request.requesterSchool}
              </Text>
              <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
                Requested chapter: {request.chapterName}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <GlassButton
                  variant="solid"
                  label="Approve"
                  style={{ flex: 1 }}
                  onPress={async () => {
                    hapticTap();
                    await approveChapterJoinRequest(request.chapterId, request.userId, profile.uid);
                    await logAdminAction("approve_chapter_request", request.userId);
                    await loadData();
                  }}
                />
                <GlassButton
                  variant="ghost"
                  label="Deny"
                  style={{ flex: 1 }}
                  onPress={async () => {
                    hapticTap();
                    await denyChapterJoinRequest(request.chapterId, request.userId, profile.uid);
                    await logAdminAction("deny_chapter_request", request.userId);
                    await loadData();
                  }}
                />
              </View>
            </View>
          ))
        )}

        <Text style={{ color: palette.colors.textSecondary, marginTop: 6, marginBottom: 8 }}>
          Chapter Members
        </Text>
        <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
          {chapterUsers.map((user) => (
            <View
              key={user.uid}
              style={{
                borderWidth: 1,
                borderColor: palette.colors.border,
                borderRadius: 12,
                padding: 10,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{user.displayName}</Text>
              <Text style={{ color: palette.colors.textSecondary }}>
                Role: {user.officerPosition ?? "Member"} - Events: {user.competitiveEvents?.length ?? 0}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <GlassButton
                  variant="ghost"
                  label="Set Officer"
                  style={{ flex: 1 }}
                  onPress={async () => {
                    hapticTap();
                    await updateDoc(doc(db, "users", user.uid), {
                      chapterRoles: Array.from(new Set([...(user.chapterRoles ?? []), "Chapter Officer"])),
                      officerPosition:
                        user.officerPosition && user.officerPosition !== "Member"
                          ? user.officerPosition
                          : "President",
                      updatedAt: serverTimestamp(),
                    });
                    await logAdminAction("assign_officer_role", user.uid);
                    await loadData();
                  }}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      </GlassSurface>

      {permissions.canManageDues() && profile?.chapterId ? (
        <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
          <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>
            Dues Management
          </Text>
          <GlassInput
            label="Amount"
            value={String(duesSettings.amount || "")}
            onChangeText={(value) => setDuesSettings((prev) => ({ ...prev, amount: Number(value) || 0 }))}
            keyboardType="numeric"
          />
          <GlassInput
            containerStyle={{ marginTop: 8 }}
            label="Deadline"
            value={duesSettings.deadline}
            onChangeText={(value) => setDuesSettings((prev) => ({ ...prev, deadline: value }))}
            placeholder="YYYY-MM-DD"
          />
          <GlassInput
            containerStyle={{ marginTop: 8 }}
            label="Payment Link"
            value={duesSettings.paymentLink}
            onChangeText={(value) => setDuesSettings((prev) => ({ ...prev, paymentLink: value }))}
            placeholder="https://..."
          />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <GlassButton
              variant="solid"
              label="Save Dues Settings"
              style={{ flex: 1 }}
              onPress={async () => {
                await setChapterDuesSettings(profile.chapterId ?? "", duesSettings);
              }}
            />
            <GlassButton
              variant="ghost"
              label="Mark All Unpaid"
              style={{ flex: 1 }}
              onPress={async () => {
                await markAllChapterMembersUnpaid(profile.chapterId ?? "");
              }}
            />
          </View>
          <Text style={{ color: palette.colors.textSecondary, marginTop: 10 }}>
            {duesRows.filter((row) => row.paid).length} of {duesRows.length} members paid
          </Text>
          <ScrollView style={{ maxHeight: 220, marginTop: 8 }} keyboardShouldPersistTaps="handled">
            {chapterUsers.map((user) => {
              const paid = duesRows.find((row) => row.uid === user.uid)?.paid ?? false;
              return (
                <View key={`dues_${user.uid}`} style={{ marginBottom: 8 }}>
                  <GlassSurface style={{ padding: 10 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: palette.colors.text }}>{user.displayName}</Text>
                      <GlassButton
                        variant={paid ? "ghost" : "solid"}
                        label={paid ? "Paid" : "Unpaid"}
                        onPress={async () => {
                          await setMemberDuesPaid(profile.chapterId ?? "", user.uid, !paid);
                        }}
                      />
                    </View>
                  </GlassSurface>
                </View>
              );
            })}
          </ScrollView>
        </GlassSurface>
      ) : null}

      <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
        <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>
          App Stats
        </Text>
        <Text style={{ color: palette.colors.textSecondary }}>Total users: {stats.totalUsers}</Text>
        <Text style={{ color: palette.colors.textSecondary }}>Active today: {stats.activeToday}</Text>
        <Text style={{ color: palette.colors.textSecondary }}>Total posts: {stats.totalPosts}</Text>
        <Text style={{ color: palette.colors.textSecondary }}>
          Practice sessions: {stats.totalPracticeSessions}
        </Text>
        <Text style={{ color: palette.colors.textSecondary }}>
          Most practiced event: {stats.mostPracticedEvent}
        </Text>
      </GlassSurface>

      <GlassButton
        variant="ghost"
        label={busy ? "Refreshing..." : "Refresh Dashboard"}
        onPress={() => {
          void refreshProfile();
          void loadData();
        }}
      />

      <Modal visible={Boolean(selectedUser)} transparent animationType="fade" onRequestClose={() => setSelectedUser(null)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 16,
          }}
        >
          <GlassSurface style={{ width: "100%", padding: 16 }}>
            <Text style={{ color: palette.colors.text, fontWeight: "800", fontSize: 18, marginBottom: 10 }}>
              User Profile
            </Text>
            {selectedUser ? (
              <View style={{ gap: 4 }}>
                <Text style={{ color: palette.colors.text }}>Name: {selectedUser.displayName}</Text>
                <Text style={{ color: palette.colors.textSecondary }}>UID: {selectedUser.uid}</Text>
                <Text style={{ color: palette.colors.textSecondary }}>School: {selectedUser.schoolName}</Text>
                <Text style={{ color: palette.colors.textSecondary }}>
                  Chapter: {selectedUser.chapterName || "Not joined"}
                </Text>
                <Text style={{ color: palette.colors.textSecondary }}>Role: {selectedUser.role || "member"}</Text>
                <Text style={{ color: palette.colors.textSecondary }}>Tier: {selectedUser.tier}</Text>
                <Text style={{ color: palette.colors.textSecondary }}>XP: {selectedUser.xp}</Text>
                <Text style={{ color: palette.colors.textSecondary }}>
                  Banned: {selectedUser.banned ? "Yes" : "No"}
                </Text>
              </View>
            ) : null}
            <GlassButton
              variant="ghost"
              label="Close"
              style={{ marginTop: 12 }}
              onPress={() => setSelectedUser(null)}
            />
          </GlassSurface>
        </View>
      </Modal>
    </ScreenShell>
  );
}
