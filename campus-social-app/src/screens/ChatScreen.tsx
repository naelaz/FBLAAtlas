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
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackButton } from "../components/navigation/BackButton";
import { GlassButton } from "../components/ui/GlassButton";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
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

function TypingDots({ color }: { color: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 4, marginTop: 2 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: 0.5 }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: 0.75 }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: 1 }} />
    </View>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8 }}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text variant="titleMedium" style={{ color: palette.colors.text, fontWeight: "700", fontSize: 22 }}>
            {otherUser?.displayName ?? "Conversation"}
          </Text>
        </View>
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 12 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const mine = item.senderId === profile.uid;
            const sender = usersById.get(item.senderId);
            return (
              <View style={{ marginBottom: 10, alignItems: mine ? "flex-end" : "flex-start" }}>
                <View
                  style={{
                    maxWidth: "75%",
                    flexDirection: mine ? "row-reverse" : "row",
                    alignItems: "flex-end",
                    gap: 8,
                  }}
                >
                  <AvatarWithStatus
                    uri={sender?.avatarUrl ?? ""}
                    size={26}
                    online={false}
                    tier={sender?.tier}
                  />
                  {mine ? (
                    <View
                      style={{
                        backgroundColor: palette.colors.primary,
                        borderRadius: 18,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={{ color: palette.colors.onPrimary }}>{item.text}</Text>
                    </View>
                  ) : (
                    <GlassSurface
                      style={{
                        borderRadius: 18,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        backgroundColor: palette.colors.glassStrong,
                      }}
                    >
                      <Text style={{ color: palette.colors.text }}>{item.text}</Text>
                    </GlassSurface>
                  )}
                </View>
                <Text style={{ color: palette.colors.textMuted, fontSize: 12, marginTop: 3 }}>
                  {formatDateTime(item.timestamp)}
                </Text>
                {mine && lastOwnMessageId === item.id && showSeen ? (
                  <Text style={{ color: palette.colors.success, fontSize: 11 }}>Seen</Text>
                ) : null}
              </View>
            );
          }}
        />

        {isOtherTyping ? (
          <View style={{ marginBottom: 8, marginLeft: 4 }}>
            <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>Typing...</Text>
            <TypingDots color={palette.colors.subtleDot} />
          </View>
        ) : null}

        <GlassSurface
          style={{
            paddingHorizontal: 8,
            paddingVertical: 8,
            marginBottom: 12,
            borderRadius: 16,
            backgroundColor: palette.colors.surface,
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
                backgroundColor: palette.colors.surfaceAlt,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: palette.colors.border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                maxHeight: 120,
                color: palette.colors.text,
                fontSize: 15,
              }}
              placeholderTextColor={palette.colors.placeholder}
            />
            <Pressable
              onPress={() => {
                hapticTap();
                void send();
              }}
              style={{
                backgroundColor: input.trim() ? palette.colors.primary : palette.colors.inputMuted,
                borderRadius: 999,
                minHeight: 48,
                paddingHorizontal: 14,
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: palette.colors.onPrimary, fontWeight: "700" }}>
                {sending ? "..." : "Send"}
              </Text>
            </Pressable>
          </View>
        </GlassSurface>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
