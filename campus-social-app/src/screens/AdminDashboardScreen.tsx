import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { Shield } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSurface } from "../components/ui/GlassSurface";
import { db } from "../config/firebase";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { FBLA_COMPETITIVE_EVENTS } from "../constants/fblaEvents";
import { RootStackParamList } from "../navigation/types";
import { hapticTap } from "../services/haptics";
import { ChapterRole, UserProfile } from "../types/social";

type ModerationPost = {
  id: string;
  content: string;
  authorName: string;
  schoolId: string;
};

type AdminStats = {
  totalUsers: number;
  activeToday: number;
  totalPracticeSessions: number;
  mostPracticedEvent: string;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AdminDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, refreshProfile } = useAuthContext();
  const { palette } = useThemeContext();

  const [queryText, setQueryText] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [xpAdjustments, setXpAdjustments] = useState<Record<string, string>>({});
  const [flaggedPosts, setFlaggedPosts] = useState<ModerationPost[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [chapterUsers, setChapterUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeToday: 0,
    totalPracticeSessions: 0,
    mostPracticedEvent: "N/A",
  });
  const [busy, setBusy] = useState(false);

  const isAdmin = profile?.role === "admin";

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
      const usersSnap = await getDocs(query(collection(db, "users"), limit(300)));
      const allUsers = usersSnap.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        return {
          uid: docSnap.id,
          displayName: typeof data.displayName === "string" ? data.displayName : "Member",
          schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
          schoolName: typeof data.schoolName === "string" ? data.schoolName : "",
          grade: typeof data.grade === "string" ? data.grade : "11",
          avatarColor:
            typeof data.avatarColor === "string" ? data.avatarColor : palette.colors.surfaceAlt,
          avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl : "",
          bio: typeof data.bio === "string" ? data.bio : "",
          xp: typeof data.xp === "number" ? data.xp : 0,
          tier:
            data.tier === "Bronze" ||
            data.tier === "Silver" ||
            data.tier === "Gold" ||
            data.tier === "Platinum" ||
            data.tier === "Diamond" ||
            data.tier === "Legend"
              ? data.tier
              : "Bronze",
          graduationYear:
            typeof data.graduationYear === "number" ? data.graduationYear : new Date().getFullYear(),
          streakCount: typeof data.streakCount === "number" ? data.streakCount : 0,
          moodEmoji: null,
          moodUpdatedAt: null,
          badges: Array.isArray(data.badges) ? data.badges.filter((x): x is string => typeof x === "string") : [],
          followerIds: [],
          followingIds: [],
          pointsByAction: {},
          lastDailyLoginDate:
            typeof data.lastDailyLoginDate === "string" ? data.lastDailyLoginDate : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          officerPosition:
            typeof data.officerPosition === "string" ? (data.officerPosition as UserProfile["officerPosition"]) : "Member",
          chapterRoles: Array.isArray(data.chapterRoles)
            ? data.chapterRoles.filter((x): x is ChapterRole => typeof x === "string")
            : [],
          competitiveEvents: Array.isArray(data.competitiveEvents)
            ? data.competitiveEvents.filter((x): x is string => typeof x === "string")
            : [],
          role: data.role === "admin" ? "admin" : "member",
          banned: typeof data.banned === "boolean" ? data.banned : false,
        } satisfies UserProfile;
      });
      setUsers(allUsers);
      setChapterUsers(allUsers.filter((user) => user.schoolId === profile.schoolId));

      const today = todayKey();
      const active = allUsers.filter((user) => user.lastDailyLoginDate === today).length;

      const flaggedSnap = await getDocs(
        query(collection(db, "posts"), where("flagged", "==", true), orderBy("createdAt", "desc"), limit(50)),
      ).catch(async () => getDocs(query(collection(db, "posts"), limit(80))));
      const flagged = flaggedSnap.docs
        .map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const flaggedValue = typeof data.flagged === "boolean" ? data.flagged : false;
          if (!flaggedValue) {
            return null;
          }
          return {
            id: docSnap.id,
            content: typeof data.content === "string" ? data.content : "",
            authorName: typeof data.authorName === "string" ? data.authorName : "Unknown",
            schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
          } satisfies ModerationPost;
        })
        .filter((item): item is ModerationPost => Boolean(item));
      setFlaggedPosts(flagged);

      const sessionsSnap = await getDocs(query(collection(db, "practiceSessions"), limit(500)));
      const totalPracticeSessions = sessionsSnap.size;
      const eventCounts = new Map<string, number>();
      sessionsSnap.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const eventId = typeof data.eventId === "string" ? data.eventId : "";
        if (!eventId) {
          return;
        }
        eventCounts.set(eventId, (eventCounts.get(eventId) ?? 0) + 1);
      });
      const mostPracticedEvent =
        [...eventCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
      setStats({
        totalUsers: allUsers.length,
        activeToday: active,
        totalPracticeSessions,
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
    if (!isAdmin) {
      Alert.alert("Access Denied", "Administrator access required.");
      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
      return;
    }
    void loadData();
  }, [isAdmin, loadData, navigation, profile]);

  const filteredUsers = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) {
      return users.slice(0, 40);
    }
    return users
      .filter((user) => {
        const mailGuess = `${user.displayName.toLowerCase().replace(/\s+/g, ".")}@`;
        return user.displayName.toLowerCase().includes(q) || mailGuess.includes(q);
      })
      .slice(0, 40);
  }, [queryText, users]);

  if (!profile) {
    return null;
  }

  return (
    <ScreenShell
      title="Admin Dashboard"
      subtitle="User management, moderation, announcements, and system stats."
      showBackButton
      onBackPress={() => navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] })}
    >
      <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Shield size={18} color={palette.colors.text} />
          <Text style={{ color: palette.colors.text, fontWeight: "800" }}>
            Administrator Access
          </Text>
        </View>
      </GlassSurface>

      <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
        <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>
          User Management
        </Text>
        <GlassInput
          value={queryText}
          onChangeText={setQueryText}
          placeholder="Search users by name or email"
          label="User Search"
        />
        <ScrollView style={{ maxHeight: 260, marginTop: 8 }}>
          {filteredUsers.map((user) => (
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
              <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                {user.displayName}
              </Text>
              <Text style={{ color: palette.colors.textSecondary }}>
                XP: {user.xp} · {user.role === "admin" ? "Admin" : "Member"} ·{" "}
                {user.banned ? "Banned" : "Active"}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <GlassButton
                  variant="ghost"
                  label={user.banned ? "Unban" : "Ban"}
                  style={{ flex: 1 }}
                  onPress={async () => {
                    hapticTap();
                    await updateDoc(doc(db, "users", user.uid), { banned: !user.banned, updatedAt: serverTimestamp() });
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
                  placeholder="+50 / -20"
                  label="XP Delta"
                />
                <GlassButton
                  variant="solid"
                  label="Apply"
                  onPress={async () => {
                    const delta = Number(xpAdjustments[user.uid] ?? "0");
                    if (!Number.isFinite(delta) || delta === 0) {
                      return;
                    }
                    hapticTap();
                    await updateDoc(doc(db, "users", user.uid), {
                      xp: increment(delta),
                      updatedAt: serverTimestamp(),
                    });
                    await logAdminAction(`adjust_xp:${delta}`, user.uid);
                    setXpAdjustments((prev) => ({ ...prev, [user.uid]: "" }));
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
          Content Moderation
        </Text>
        {flaggedPosts.length === 0 ? (
          <Text style={{ color: palette.colors.textSecondary }}>No flagged posts right now.</Text>
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
              <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>{post.content}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
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
              </View>
            </View>
          ))
        )}
      </GlassSurface>

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
            const payload = {
              title: "Administrator Announcement",
              body,
              author: profile.displayName,
              schoolId: profile.schoolId,
              pinned: true,
              createdAt: serverTimestamp(),
            };
            await setDoc(doc(collection(db, "announcements")), payload);
            await setDoc(doc(collection(db, "homeFeed")), payload);
            await logAdminAction("post_announcement");
            setAnnouncement("");
          }}
        />
      </GlassSurface>

      <GlassSurface style={{ padding: 12, marginBottom: 12 }}>
        <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>
          Chapter Management
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
                Role: {user.officerPosition ?? "Member"} · Events: {user.competitiveEvents?.length ?? 0}
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
        <Text style={{ color: palette.colors.textSecondary }}>
          Active today: {stats.activeToday}
        </Text>
        <Text style={{ color: palette.colors.textSecondary }}>
          Practice sessions: {stats.totalPracticeSessions}
        </Text>
        <Text style={{ color: palette.colors.textSecondary }}>
          Most practiced event:{" "}
          {FBLA_COMPETITIVE_EVENTS.find((name) => name.toLowerCase().replace(/\s+/g, "-") === stats.mostPracticedEvent) ??
            stats.mostPracticedEvent}
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
    </ScreenShell>
  );
}
