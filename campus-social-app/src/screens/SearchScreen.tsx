import React, { useState } from "react";
import { View } from "react-native";
import { Button, Card, Searchbar, Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { useAuthContext } from "../context/AuthContext";
import { searchFblaAtlas } from "../services/socialService";
import { PostItem, UserProfile } from "../types/social";

export function SearchScreen() {
  const { profile } = useAuthContext();
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
        <Searchbar
          placeholder="Search names, grades, post keywords"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void runSearch()}
        />
        <Button mode="contained" onPress={() => void runSearch()} loading={searching}>
          Search FBLA Atlas
        </Button>
      </View>

      <View style={{ marginTop: 14, gap: 8 }}>
        <Text variant="titleMedium" style={{ fontWeight: "700", color: "#0F172A" }}>
          Students
        </Text>
        {users.map((user) => (
          <Card key={user.uid} mode="elevated" style={{ backgroundColor: "#FFFFFF" }}>
            <Card.Title title={user.displayName} subtitle={`${user.grade}th grade • ${user.tier}`} />
          </Card>
        ))}
        {users.length === 0 ? (
          <Text style={{ color: "#64748B" }}>No student results yet.</Text>
        ) : null}
      </View>

      <View style={{ marginTop: 14, gap: 8 }}>
        <Text variant="titleMedium" style={{ fontWeight: "700", color: "#0F172A" }}>
          Posts
        </Text>
        {posts.map((post) => (
          <Card key={post.id} mode="elevated" style={{ backgroundColor: "#FFFFFF" }}>
            <Card.Title title={post.authorName} subtitle={`${post.likeCount} likes`} />
            <Card.Content>
              <Text>{post.content}</Text>
            </Card.Content>
          </Card>
        ))}
        {posts.length === 0 ? (
          <Text style={{ color: "#64748B" }}>No post results yet.</Text>
        ) : null}
      </View>
    </ScreenShell>
  );
}
