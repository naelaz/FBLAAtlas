import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Searchbar, Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { GlassSurface } from "../components/ui/GlassSurface";
import { TierBadge } from "../components/ui/TierBadge";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { searchFblaAtlas } from "../services/socialService";
import { PostItem, UserProfile } from "../types/social";

export function SearchScreen() {
  const { profile } = useAuthContext();
  const { palette } = useThemeContext();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);

  const runSearch = async () => {
    if (!profile || !query.trim()) {
      setUsers([]);
      setPosts([]);
      return;
    }

    setSearching(true);
    try {
      const result = await searchFblaAtlas(profile.schoolId, query);
      setUsers(result.users);
      setPosts(result.posts);
    } catch (error) {
      console.warn("Search failed:", error);
      setUsers([]);
      setPosts([]);
    } finally {
      setSearching(false);
    }
  };

  const refresh = async () => {
    if (!profile || !query.trim()) {
      return;
    }
    setRefreshing(true);
    try {
      const result = await searchFblaAtlas(profile.schoolId, query);
      setUsers(result.users);
      setPosts(result.posts);
    } catch (error) {
      console.warn("Search refresh failed:", error);
      setUsers([]);
      setPosts([]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScreenShell
      title="Search"
      subtitle="Search students and posts in FBLA Atlas."
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    >
      <View className="gap-3">
        <GlassSurface elevation={2} borderRadius={14} style={{ backgroundColor: palette.colors.inputSurface }}>
          <Searchbar
            placeholder="Search names, grades, post keywords"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void runSearch()}
            style={{ backgroundColor: palette.colors.inputSurface }}
          />
        </GlassSurface>

        <Pressable onPress={() => void runSearch()} style={{ minHeight: 44 }} disabled={searching}>
          {({ pressed }) => (
            <GlassSurface
              tone="accent"
              strong
              pressed={pressed}
              disabled={searching}
              elevation={3}
              borderRadius={12}
              style={{
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: palette.colors.onPrimary, fontWeight: "800" }}>
                {searching ? "Searching..." : "Search FBLA Atlas"}
              </Text>
            </GlassSurface>
          )}
        </Pressable>
      </View>

      <View style={{ marginTop: 14, gap: 8 }}>
        <Text variant="titleMedium" style={{ fontWeight: "700", color: palette.colors.text }}>
          Students
        </Text>
        {users.map((user) => (
          <GlassSurface
            key={user.uid}
            elevation={2}
            borderRadius={12}
            style={{ backgroundColor: palette.colors.surface, padding: 12 }}
          >
            <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{user.displayName}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
              <Text style={{ color: palette.colors.textSecondary }}>{user.grade}th grade</Text>
              <TierBadge tier={user.tier} />
            </View>
          </GlassSurface>
        ))}
        {users.length === 0 ? (
          <Text style={{ color: palette.colors.textSecondary }}>No student results yet.</Text>
        ) : null}
      </View>

      <View style={{ marginTop: 14, gap: 8 }}>
        <Text variant="titleMedium" style={{ fontWeight: "700", color: palette.colors.text }}>
          Posts
        </Text>
        {posts.map((post) => (
          <GlassSurface
            key={post.id}
            elevation={2}
            borderRadius={12}
            style={{ backgroundColor: palette.colors.surface, padding: 12 }}
          >
            <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{post.authorName}</Text>
            <Text style={{ color: palette.colors.textSecondary }}>{post.likeCount} likes</Text>
            <Text style={{ color: palette.colors.text, marginTop: 6 }}>{post.content}</Text>
          </GlassSurface>
        ))}
        {posts.length === 0 ? (
          <Text style={{ color: palette.colors.textSecondary }}>No post results yet.</Text>
        ) : null}
      </View>
    </ScreenShell>
  );
}

