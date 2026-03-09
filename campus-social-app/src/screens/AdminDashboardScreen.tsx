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
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSurface } from "../components/ui/GlassSurface";
import { db } from "../config/firebase";
import { getTierForXp } from "../constants/gamification";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
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
import { fetchAllUsers } from "../services/userService";
import { UserProfile } from "../types/social";

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

  const [queryText, setQueryText] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [xpAdjustments, setXpAdjustments] = useState<Record<string, string>>({});
  const [flaggedPosts, setFlaggedPosts] = useState<ModerationPost[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ChapterJoinRequest[]>([]);
  const [chapterUsers, setChapterUsers] = useState<UserProfile[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeToday: 0,
    totalPosts: 0,
    totalPracticeSessions: 0,
    mostPracticedEvent: "N/A",
  });
  const [busy, setBusy] = useState(false);

  const isAdmin = profile?.role === "admin";
  const isChapterOfficer =
    profile?.officerPosition === "President" || Boolean(profile?.chapterRoles?.includes("Chapter Officer"));
  const canAccessDashboard = Boolean(isAdmin || isChapterOfficer);

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
        <ScrollView style={{ maxHeight: 280, marginTop: 8 }}>
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
                {new Date(post.timestamp).toLocaleString()}
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
        <ScrollView style={{ maxHeight: 220 }}>
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
