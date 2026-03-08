import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
  ListRenderItemInfo,
  Platform,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Chip, Text } from "react-native-paper";

import { FinnInput } from "../components/FinnInput";
import { FinnRobotIcon } from "../components/branding/FinnRobotIcon";
import { GlassSurface } from "../components/ui/GlassSurface";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { hapticTap } from "../services/haptics";
import { askFinn, isFinnConfigured } from "../services/finnService";
import { FinnChatMessage } from "../types/finn";

const PLACEHOLDERS = [
  "Ask me about upcoming school events...",
  "Need help with FBLA prep?",
  "What clubs should I join?",
  "How do I level up my tier?",
  "Who's leading the leaderboard?",
  "Summarize today's school news...",
  "Help me find a study group...",
  "What events are happening this week?",
  "How do I prepare for FBLA nationals?",
  "What's the most active club right now?",
];

const QUICK_REPLIES = [
  "📅 Events this week",
  "🏆 My XP & Tier",
  "📚 FBLA Help",
  "👥 Find Friends",
  "🎯 Study Groups",
];

const RESOURCE_LINKS = [
  { id: "khan", label: "Khan Academy", url: "https://www.khanacademy.org" },
  { id: "college_board", label: "College Board", url: "https://www.collegeboard.org" },
  { id: "fbla", label: "FBLA Official", url: "https://www.fbla.org" },
  { id: "common_app", label: "Common App", url: "https://www.commonapp.org" },
];

function createMessage(
  role: FinnChatMessage["role"],
  text: string,
  options?: Pick<FinnChatMessage, "pending" | "error">,
): FinnChatMessage {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    createdAt: Date.now(),
    pending: options?.pending,
    error: options?.error,
  };
}

function ThinkingDot({ delayMs }: { delayMs: number }) {
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(withTiming(1, { duration: 300 }), withTiming(0.45, { duration: 300 })),
        -1,
        false,
      ),
    );
  }, [delayMs, pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: "#64748B",
        },
        style,
      ]}
    />
  );
}

function ThinkingIndicator() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, minHeight: 20 }}>
      <ThinkingDot delayMs={0} />
      <ThinkingDot delayMs={120} />
      <ThinkingDot delayMs={240} />
    </View>
  );
}

export function FinnScreen() {
  const { profile } = useAuthContext();
  const { palette } = useThemeContext();
  const insets = useSafeAreaInsets();
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<FinnChatMessage[]>([
    createMessage(
      "assistant",
      "Hey! I'm Finn 👋 Your school's AI assistant. Ask me anything about events, clubs, FBLA prep, or how to climb the leaderboard!",
    ),
  ]);

  const listRef = useRef<FlatList<FinnChatMessage>>(null);
  const hasApiKey = useMemo(() => isFinnConfigured(), []);

  const scrollToLatest = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    scrollToLatest();
  }, [messages.length]);

  const sendMessage = async (rawText: string) => {
    const messageText = rawText.trim();
    if (!messageText || sending) {
      return;
    }

    const userMessage = createMessage("user", messageText);
    const pendingAssistantId = `${Date.now()}_pending`;
    const pendingAssistant: FinnChatMessage = {
      id: pendingAssistantId,
      role: "assistant",
      text: "",
      createdAt: Date.now(),
      pending: true,
    };

    const historyForModel = [...messages.filter((item) => !item.pending), userMessage];

    setSending(true);
    setMessages((prev) => [...prev, userMessage, pendingAssistant]);
    scrollToLatest();

    try {
      const responseText = await askFinn({
        message: messageText,
        userName: profile?.displayName,
        schoolName: profile?.schoolName,
        history: historyForModel,
      });

      setMessages((prev) =>
        prev.map((item) =>
          item.id === pendingAssistantId
            ? {
                ...item,
                text: responseText,
                pending: false,
              }
            : item,
        ),
      );
    } catch (error) {
      const responseText =
        error instanceof Error
          ? `Finn error: ${error.message}`
          : "Finn error: Request failed. Please try again.";

      setMessages((prev) =>
        prev.map((item) =>
          item.id === pendingAssistantId
            ? {
                ...item,
                text: responseText,
                pending: false,
                error: true,
              }
            : item,
        ),
      );
    } finally {
      setSending(false);
      scrollToLatest();
    }
  };

  const renderMessage = ({ item }: ListRenderItemInfo<FinnChatMessage>) => {
    const assistant = item.role === "assistant";

    return (
      <View
        style={{
          marginBottom: 12,
          alignItems: assistant ? "flex-start" : "flex-end",
        }}
      >
        <View
          style={{
            flexDirection: assistant ? "row" : "row-reverse",
            alignItems: "flex-end",
            gap: 8,
            maxWidth: "100%",
          }}
        >
          {assistant ? (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(99,102,241,0.2)",
                borderWidth: 1,
                borderColor: "rgba(99,102,241,0.35)",
              }}
            >
              <FinnRobotIcon size={24} />
            </View>
          ) : null}

          {assistant ? (
            <GlassSurface
              style={{
                borderRadius: 18,
                paddingHorizontal: 12,
                paddingVertical: 10,
                maxWidth: "75%",
                backgroundColor: palette.colors.glass,
                borderColor: item.error ? palette.colors.danger : palette.colors.glassBorder,
              }}
            >
              {item.pending ? (
                <ThinkingIndicator />
              ) : (
                <Text style={{ color: palette.colors.text, lineHeight: 20 }}>{item.text}</Text>
              )}
            </GlassSurface>
          ) : (
            <View
              style={{
                backgroundColor: palette.colors.primary,
                borderRadius: 18,
                paddingHorizontal: 12,
                paddingVertical: 10,
                maxWidth: "75%",
              }}
            >
              <Text style={{ color: "#FFFFFF", lineHeight: 20 }}>{item.text}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 6 : 0}
      >
        <View style={{ flex: 1, paddingHorizontal: 14, paddingTop: 10 }}>
          <GlassSurface
            style={{
              marginBottom: 10,
              backgroundColor: palette.colors.glass,
              borderColor: palette.colors.glassBorder,
              paddingHorizontal: 12,
              paddingVertical: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(99,102,241,0.22)",
                }}
              >
                <FinnRobotIcon size={26} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ color: palette.colors.text, fontWeight: "800" }}>
                  Finn AI Agent
                </Text>
                <Text style={{ color: palette.colors.muted }}>
                  {hasApiKey ? "Live AI mode enabled" : "Live AI disabled (add OpenAI key)"}
                </Text>
              </View>
              <Chip compact icon="school">
                FBLA
              </Chip>
            </View>
          </GlassSurface>

          {messages.length <= 1 ? (
            <View style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {QUICK_REPLIES.map((label) => (
                  <Pressable
                    key={label}
                    onPress={() => {
                      hapticTap();
                      void sendMessage(label);
                    }}
                    style={{
                      minHeight: 44,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: palette.colors.border,
                      backgroundColor: palette.colors.surface,
                      paddingHorizontal: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: palette.colors.text, fontWeight: "600" }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <GlassSurface style={{ marginBottom: 10, padding: 10 }}>
            <Text style={{ color: palette.colors.text, fontWeight: "800", marginBottom: 8 }}>
              Resources
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {RESOURCE_LINKS.map((link) => (
                <Pressable
                  key={link.id}
                  onPress={() => {
                    hapticTap();
                    void Linking.openURL(link.url);
                  }}
                  style={{
                    minHeight: 44,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: palette.colors.border,
                    backgroundColor: palette.colors.surface,
                    paddingHorizontal: 12,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{link.label}</Text>
                </Pressable>
              ))}
            </View>
          </GlassSurface>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 10 }}
            onContentSizeChange={() => scrollToLatest()}
          />

          <View
            style={{
              paddingBottom: Math.max(insets.bottom, 10),
              paddingTop: 6,
            }}
          >
            <FinnInput
              placeholders={PLACEHOLDERS}
              disabled={sending}
              onSubmit={(text) => {
                void sendMessage(text);
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
