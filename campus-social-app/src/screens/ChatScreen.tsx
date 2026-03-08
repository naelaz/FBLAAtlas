import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput as NativeTextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Avatar, Button, Text } from "react-native-paper";

import { GlassSurface } from "../components/ui/GlassSurface";
import { useAuthContext } from "../context/AuthContext";
import { useGamification } from "../context/GamificationContext";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import { formatDateTime } from "../services/firestoreUtils";
import { hapticTap } from "../services/haptics";
import {
  fetchConversationById,
  fetchMessagesOnce,
  markConversationRead,
  sendMessageToStudent,
  setTypingStatus,
  subscribeConversation,
  subscribeMessages,
} from "../services/messagingService";
import { fetchSchoolUsersOnce } from "../services/socialService";
import { ConversationItem, MessageItem, UserProfile } from "../types/social";

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

function TypingDots() {
  const opacity = useSharedValue(0.2);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 450 }), withTiming(0.2, { duration: 450 })),
      -1,
      false,
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[style, { flexDirection: "row", gap: 4, marginTop: 2 }]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#64748B" }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#64748B" }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#64748B" }} />
    </Animated.View>
  );
}

export function ChatScreen({ route, navigation }: Props) {
  const { conversationId } = route.params;
  const { profile } = useAuthContext();
  const { handleAwardResult } = useGamification();
  const { palette } = useThemeContext();

  const [conversation, setConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [usersById, setUsersById] = useState<Map<string, UserProfile>>(new Map());
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const inputRef = useRef<NativeTextInput>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const bootstrap = async () => {
      try {
        const [conversationData, messageData, users] = await Promise.all([
          fetchConversationById(conversationId),
          fetchMessagesOnce(conversationId),
          fetchSchoolUsersOnce(profile.schoolId),
        ]);
        setConversation(conversationData);
        setMessages(messageData);
        setUsersById(new Map(users.map((user) => [user.uid, user])));
      } catch (error) {
        console.warn("Chat bootstrap failed:", error);
      }
    };
    void bootstrap();
  }, [conversationId, profile?.uid, profile?.schoolId]);

  useEffect(() => {
    const unsubs = [
      subscribeMessages(
        conversationId,
        (rows) => {
          setMessages(rows);
          if (profile) {
            void markConversationRead(conversationId, profile.uid);
          }
        },
        (error) => {
          console.warn("Message stream failed:", error);
        },
      ),
      subscribeConversation(
        conversationId,
        (next) => {
          setConversation(next);
        },
        (error) => {
          console.warn("Conversation stream failed:", error);
        },
      ),
    ];

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [conversationId, profile?.uid]);

  useEffect(() => {
    if (!profile) {
      return;
    }
    void markConversationRead(conversationId, profile.uid);
  }, [conversationId, profile?.uid]);

  useEffect(() => {
    navigation.setOptions({ title: "Chat" });
  }, [navigation]);

  const otherUser = useMemo(() => {
    if (!profile || !conversation) {
      return null;
    }
    const otherId = conversation.participants.find((id) => id !== profile.uid);
    return otherId ? usersById.get(otherId) ?? null : null;
  }, [conversation, usersById, profile]);

  const isOtherTyping = useMemo(() => {
    if (!profile || !conversation) {
      return false;
    }
    const otherId = conversation.participants.find((id) => id !== profile.uid);
    if (!otherId) {
      return false;
    }
    return Boolean(conversation.typingBy?.[otherId]);
  }, [conversation, profile]);

  const lastOwnMessageId = useMemo(() => {
    if (!profile) {
      return null;
    }
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].senderId === profile.uid) {
        return messages[index].id;
      }
    }
    return null;
  }, [messages, profile?.uid]);

  const showSeen = useMemo(() => {
    if (!profile || !conversation) {
      return false;
    }
    const otherId = conversation.participants.find((id) => id !== profile.uid);
    if (!otherId) {
      return false;
    }
    const unreadForOther = conversation.unreadCounts?.[otherId] ?? 0;
    return unreadForOther === 0 && conversation.lastMessageSenderId === profile.uid;
  }, [conversation, profile]);

  const notifyTyping = (value: boolean) => {
    if (!profile) {
      return;
    }
    void setTypingStatus(conversationId, profile.uid, value);
  };

  const onInputChange = (value: string) => {
    setInput(value);
    if (!typing) {
      setTyping(true);
      notifyTyping(true);
    }

    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    typingTimeout.current = setTimeout(() => {
      setTyping(false);
      notifyTyping(false);
    }, 1200);
  };

  const send = async () => {
    if (!profile || !otherUser) {
      return;
    }
    const trimmed = input.trim();
    if (!trimmed || sending) {
      return;
    }
    setSending(true);
    setInput("");
    setTyping(false);
    notifyTyping(false);

    try {
      const result = await sendMessageToStudent(profile, otherUser, trimmed);
      handleAwardResult(result?.awarded);
      void markConversationRead(conversationId, profile.uid);
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (error) {
      console.warn("Send chat message failed:", error);
    } finally {
      setSending(false);
    }
  };

  if (!profile) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 10 }}>
        {otherUser ? (
          <GlassSurface style={{ padding: 10, marginBottom: 10, backgroundColor: "rgba(255,255,255,0.75)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Avatar.Image size={34} source={{ uri: otherUser.avatarUrl }} />
              <View>
                <Text style={{ fontWeight: "800", color: "#0F172A" }}>{otherUser.displayName}</Text>
                <Text style={{ color: "#64748B", fontSize: 12 }}>{otherUser.schoolName}</Text>
              </View>
            </View>
          </GlassSurface>
        ) : null}

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 12 }}
          renderItem={({ item }) => {
            const mine = item.senderId === profile.uid;
            const sender = usersById.get(item.senderId);
            return (
              <View style={{ marginBottom: 10, alignItems: mine ? "flex-end" : "flex-start" }}>
                <View
                  style={{
                    maxWidth: "88%",
                    flexDirection: mine ? "row-reverse" : "row",
                    alignItems: "flex-end",
                    gap: 8,
                  }}
                >
                  <Avatar.Image
                    size={26}
                    source={{ uri: sender?.avatarUrl ?? "https://i.pravatar.cc/150?img=20" }}
                  />
                  {mine ? (
                    <View
                      style={{
                        backgroundColor: "#2563EB",
                        borderRadius: 18,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={{ color: "white" }}>{item.text}</Text>
                    </View>
                  ) : (
                    <GlassSurface
                      style={{
                        borderRadius: 18,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        backgroundColor: "rgba(255,255,255,0.72)",
                      }}
                    >
                      <Text style={{ color: "#0F172A" }}>{item.text}</Text>
                    </GlassSurface>
                  )}
                </View>
                <Text style={{ color: "#64748B", fontSize: 11, marginTop: 3 }}>
                  {formatDateTime(item.timestamp)}
                </Text>
                {mine && lastOwnMessageId === item.id && showSeen ? (
                  <Text style={{ color: "#0EA5A4", fontSize: 11 }}>Seen</Text>
                ) : null}
              </View>
            );
          }}
        />

        {isOtherTyping ? (
          <View style={{ marginBottom: 8, marginLeft: 4 }}>
            <Text style={{ color: "#64748B", fontSize: 12 }}>Typing...</Text>
            <TypingDots />
          </View>
        ) : null}

        <GlassSurface
          style={{
            paddingHorizontal: 8,
            paddingVertical: 8,
            marginBottom: 10,
            backgroundColor: "rgba(255,255,255,0.8)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <NativeTextInput
              ref={inputRef}
              value={input}
              onChangeText={onInputChange}
              placeholder="Write a message..."
              multiline
              style={{
                flex: 1,
                backgroundColor: "#F8FAFC",
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 10,
                maxHeight: 120,
              }}
            />
            <Pressable
              onPress={() => {
                hapticTap();
                void send();
              }}
              style={{
                backgroundColor: input.trim() ? "#2563EB" : "#93C5FD",
                borderRadius: 24,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>{sending ? "..." : "Send"}</Text>
            </Pressable>
          </View>
        </GlassSurface>
        <Button
          mode="text"
          onPress={() => {
            hapticTap();
            inputRef.current?.focus();
          }}
        >
          Reply
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
