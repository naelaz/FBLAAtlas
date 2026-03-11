import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { BookOpen } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Platform,
  Pressable,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { FinnInput } from "../components/FinnInput";
import { FinnRobotIcon } from "../components/branding/FinnRobotIcon";
import { BackButton } from "../components/navigation/BackButton";
import { Badge } from "../components/ui/badge";
import { GlassSurface } from "../components/ui/GlassSurface";
import { MessageLoading } from "../components/ui/MessageLoading";
import { useAuthContext } from "../context/AuthContext";
import { useNavBarVisibility } from "../context/NavBarVisibilityContext";
import { useThemeContext } from "../context/ThemeContext";
import { useNavBarScroll } from "../hooks/useNavBarScroll";
import { askFinn, isFinnConfigured } from "../services/finnService";
import { FinnChatMessage } from "../types/finn";

const PLACEHOLDERS = [
  "Ask Finn anything...",
  "How do I prep for Business Law?",
  "What is on the NLC agenda?",
  "Help me improve my presentation score",
  "How do I level up my XP faster?",
];

const FINN_WELCOME_SEEN_KEY = "fbla_finn_welcome_seen_v1";

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

export function FinnScreen() {
  const navigation = useNavigation();
  const { profile } = useAuthContext();
  const { hideNavBar, showNavBar } = useNavBarVisibility();
  const { palette } = useThemeContext();
  const { onScroll, onScrollBeginDrag, scrollEventThrottle } = useNavBarScroll();
  const insets = useSafeAreaInsets();

  const [sending, setSending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [messages, setMessages] = useState<FinnChatMessage[]>([]);

  const listRef = useRef<FlatList<FinnChatMessage>>(null);
  const hasBackend = useMemo(() => isFinnConfigured(), []);

  const scrollToLatest = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    // Load previous messages from storage but don't inject any pre-canned messages
    let active = true;
    const loadHistory = async () => {
      try {
        const perUserKey = `finn_chat_history_v1:${profile?.uid ?? "guest"}`;
        const raw = await AsyncStorage.getItem(perUserKey);
        if (!active || !raw) return;
        const parsed = JSON.parse(raw) as FinnChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed.slice(-40));
        }
      } catch {
        // ignore
      }
    };
    void loadHistory();
    return () => { active = false; };
  }, [profile?.uid]);

  useEffect(() => {
    scrollToLatest();
  }, [messages.length]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
      hideNavBar();
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
      showNavBar();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      showNavBar();
    };
  }, [hideNavBar, showNavBar]);

  const inputBottomPadding = Math.max(insets.bottom, 10) + 8;
  const showBackButton = navigation.canGoBack();

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
    } catch {
      setMessages((prev) =>
        prev.map((item) =>
          item.id === pendingAssistantId
            ? {
                ...item,
                text: "I hit a temporary issue. Try again in a few seconds.",
                pending: false,
                error: true,
              }
            : item,
        ),
      );
    } finally {
      setSending(false);
      scrollToLatest();
      // Persist chat history
      try {
        const perUserKey = `finn_chat_history_v1:${profile?.uid ?? "guest"}`;
        setMessages((prev) => {
          void AsyncStorage.setItem(perUserKey, JSON.stringify(prev.slice(-40)));
          return prev;
        });
      } catch { /* ignore */ }
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
                backgroundColor: palette.colors.secondarySoft,
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
              {item.pending ? <MessageLoading size="md" /> : <Text style={{ color: palette.colors.text, lineHeight: 20 }}>{item.text}</Text>}
            </GlassSurface>
          ) : (
            <GlassSurface
              tone="accent"
              strong
              elevation={2}
              style={{
                backgroundColor: palette.colors.primary,
                borderRadius: 18,
                paddingHorizontal: 12,
                paddingVertical: 10,
                maxWidth: "75%",
              }}
            >
              <Text style={{ color: palette.colors.onPrimary, lineHeight: 20 }}>{item.text}</Text>
            </GlassSurface>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }} edges={["top", "left", "right"]}>
      <LinearGradient
        colors={[palette.colors.background, palette.colors.surface, palette.colors.elevated]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, right: 0, left: 0, bottom: 0 }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 6 : 0}
      >
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {showBackButton ? <BackButton onPress={() => navigation.goBack()} /> : null}
              <Text variant="titleMedium" style={{ color: palette.colors.text, fontWeight: "700", fontSize: 22 }}>
                Finn
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate("Glossary" as never)}
              style={{ minHeight: 40, minWidth: 40, alignItems: "center", justifyContent: "center" }}
              accessibilityRole="button"
              accessibilityLabel="Open glossary"
            >
              <BookOpen size={18} color={palette.colors.text} />
            </Pressable>
          </View>
          <GlassSurface
            style={{
              marginBottom: 12,
              backgroundColor: palette.colors.surface,
              borderColor: palette.colors.border,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 16,
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
                  backgroundColor: palette.colors.secondarySoft,
                }}
              >
                <FinnRobotIcon size={26} />
              </View>
              <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ color: palette.colors.text, fontWeight: "600", fontSize: 16 }}>
                    Finn AI Agent
                  </Text>
                  <Text style={{ color: palette.colors.textMuted, fontSize: 13 }}>
                    Your AI FBLA coach
                  </Text>
                </View>
              <Badge size="sm" variant="blue-subtle" capitalize={false}>
                FBLA
              </Badge>
            </View>
          </GlassSurface>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 12 }}
            onContentSizeChange={() => scrollToLatest()}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={scrollEventThrottle}
            onScroll={onScroll}
            onScrollBeginDrag={onScrollBeginDrag}
          />

          <View
            style={{
              paddingBottom: keyboardVisible ? inputBottomPadding : inputBottomPadding + 90,
              paddingTop: 6,
            }}
          >
            <FinnInput
              placeholders={PLACEHOLDERS}
              disabled={sending}
              onFocus={() => hideNavBar()}
              onBlur={() => {
                if (!keyboardVisible) {
                  showNavBar();
                }
              }}
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



