import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { CornerDownRight, Heart, MessageCircle as MessageCircleIcon, PenSquare, Search as SearchIcon, Send, Trophy, Users, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Text } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppLogo } from "../components/branding/AppLogo";
import { NotificationBell } from "../components/NotificationBell";
import { FblaSocialSection } from "../components/social/FblaSocialSection";
import { AvatarWithStatus } from "../components/ui/AvatarWithStatus";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassInput } from "../components/ui/GlassInput";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { GlassSurface } from "../components/ui/GlassSurface";
import { useAccessibility } from "../context/AccessibilityContext";
import { useAuthContext } from "../context/AuthContext";
import { usePushNotifications } from "../context/PushNotificationsContext";
import { useSettings } from "../context/SettingsContext";
import { useThemeContext } from "../context/ThemeContext";
import { useNavBarScroll } from "../hooks/useNavBarScroll";
import { usePermissions } from "../hooks/usePermissions";
import { RootStackParamList } from "../navigation/types";
import { AnnouncementItem, fetchLatestAnnouncement, fetchMeetingNotes } from "../services/chapterService";
import { respondToChallenge, subscribeIncomingChallenges } from "../services/challengeService";
import { createChapterGoal, submitGoalContribution, subscribeChapterGoals } from "../services/goalsService";
import { subscribeOfficerTasks } from "../services/officerTaskService";
import { subscribeRecognitionPlacements } from "../services/recognitionService";
import { addCommentToPost, fetchEventsOnce, fetchPostsOnce, subscribePostComments, toggleLikeOnPost } from "../services/socialService";
import { joinStudySession, subscribeStudySessions } from "../services/studySessionService";
import { formatRelativeDateTime } from "../services/firestoreUtils";
import { hapticTap } from "../services/haptics";
import { sendLocalPush } from "../services/pushService";
import { CommentItem, EventItem, PostItem } from "../types/social";
import { ChapterGoal, MeetingActionItem, OfficerTask, PracticeChallenge, RecognitionPlacement, StudySession } from "../types/features";

const QUICK_ACTIONS: Array<{ id: string; label: string; route: keyof RootStackParamList; color: string }> = [
  { id: "find_members", label: "Find Members", route: "Search", color: "#4A90D9" },
  { id: "conferences", label: "Conferences", route: "MyConferences", color: "#9B59B6" },
  { id: "leaderboard", label: "Leaderboard", route: "Leaderboard", color: "#F39C12" },
  { id: "create_post", label: "New Post", route: "CreatePost", color: "#27AE60" },
];
function buildFallbackPosts(schoolId: string): PostItem[] {
  const now = Date.now();
  const hour = 1000 * 60 * 60;
  return [
    {
      id: "fp_1", schoolId,
      authorId: "demo_morgan_l", authorName: "Morgan L.", authorAvatarColor: "#6C63FF",
      imageUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600&auto=format&fit=crop",
      tags: ["Business Plan", "Competition Prep"],
      content: "Just submitted my Business Plan project — 18 pages, 3 months of work. Super proud of where it landed. Fingers crossed for SLC! Who else is competing in Business Plan this season?",
      createdAt: new Date(now - hour * 1).toISOString(),
      likeCount: 34, commentCount: 8, likedBy: [], reactionCounts: {}, userReactions: {},
    },
    {
      id: "fp_2", schoolId,
      authorId: "seed_fbla_atlas", authorName: "FBLA Atlas", authorAvatarColor: "#FFD700",
      imageUrl: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1600&auto=format&fit=crop",
      tags: ["Tips", "NLC"],
      content: "🏆 NLC 2026 is in Atlanta, GA — June 24–27. Registration opens soon. Start preparing NOW. Top tip: judges remember your first 30 seconds and your closing. Build those first.",
      createdAt: new Date(now - hour * 3).toISOString(),
      likeCount: 61, commentCount: 14, likedBy: [], reactionCounts: {}, userReactions: {},
    },
    {
      id: "fp_3", schoolId,
      authorId: "demo_avery_n", authorName: "Avery N.", authorAvatarColor: "#FF6B6B",
      imageUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1600&auto=format&fit=crop",
      tags: ["Public Speaking", "SLC"],
      content: "3rd year qualifying for SLC in Public Speaking. The secret? Record yourself every single practice session. Watching yourself back is brutal but it works. DM me if you want feedback on your speech.",
      createdAt: new Date(now - hour * 6).toISOString(),
      likeCount: 47, commentCount: 11, likedBy: [], reactionCounts: {}, userReactions: {},
    },
    {
      id: "fp_4", schoolId,
      authorId: "demo_reese_o", authorName: "Reese O.", authorAvatarColor: "#4ECDC4",
      imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&auto=format&fit=crop",
      tags: ["Accounting", "Study Group"],
      content: "Hosting a study session for Accounting and Advanced Accounting this Thursday at 4pm in the library. Bring your practice tests. We'll do timed rounds and review together. All skill levels welcome.",
      createdAt: new Date(now - hour * 12).toISOString(),
      likeCount: 28, commentCount: 6, likedBy: [], reactionCounts: {}, userReactions: {},
    },
    {
      id: "fp_5", schoolId,
      authorId: "demo_piper_m", authorName: "Piper M.", authorAvatarColor: "#A8E6CF",
      imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1600&auto=format&fit=crop",
      tags: ["Entrepreneurship", "Chapter News"],
      content: "Our chapter's entrepreneurship team just finished our first full pitch rehearsal! We've got the product, the market research, and the financials locked. Judges, we're coming for you. 💪",
      createdAt: new Date(now - hour * 20).toISOString(),
      likeCount: 52, commentCount: 9, likedBy: [], reactionCounts: {}, userReactions: {},
    },
    {
      id: "fp_6", schoolId,
      authorId: "demo_alex", authorName: "Alex M.", authorAvatarColor: "#FF8B94",
      imageUrl: "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=1600&auto=format&fit=crop",
      tags: ["Business Law", "Officer Update"],
      content: "Chapter update: our DLC registration deadline is coming up. Make sure you've confirmed your events with the advisor. Business Law, Public Speaking, and Entrepreneurship are almost at capacity for our chapter slots.",
      createdAt: new Date(now - hour * 28).toISOString(),
      likeCount: 39, commentCount: 7, likedBy: [], reactionCounts: {}, userReactions: {},
    },
  ];
}

function buildHomeFallbackEvents(schoolId: string): EventItem[] {
  // Pin events to real upcoming dates so the calendar widget is always accurate.
  // We compute dates relative to the current Monday so dots appear on the right days.
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);

  function weekday(offsetFromMonday: number, hour: number): string {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offsetFromMonday);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }

  return [
    // This week — calendar dots will appear on these days
    { id: "hf_1", schoolId, title: "Chapter Meeting", description: "Weekly chapter meeting — agenda: DLC registration and event assignments.", location: "Room 112", category: "FBLA", startAt: weekday(0, 16), attendeeIds: [], attendeeCount: 18, capacity: 60 },
    { id: "hf_2", schoolId, title: "Public Speaking Practice", description: "Open mic session for speech practice. All levels welcome.", location: "Auditorium", category: "Academic", startAt: weekday(1, 15), attendeeIds: [], attendeeCount: 9, capacity: 25 },
    { id: "hf_3", schoolId, title: "Business Plan Review", description: "Peer review of draft business plans before submission.", location: "Library Conference Room", category: "FBLA", startAt: weekday(2, 16), attendeeIds: [], attendeeCount: 7, capacity: 20 },
    { id: "hf_4", schoolId, title: "Study Session: Objective Tests", description: "Group study for Business Law, Economics, Accounting.", location: "Room 204", category: "Academic", startAt: weekday(3, 15), attendeeIds: [], attendeeCount: 12, capacity: 20 },
    { id: "hf_5", schoolId, title: "Mock Interview Workshop", description: "Practice interviews with local business volunteers.", location: "Career Center", category: "Academic", startAt: weekday(4, 14), attendeeIds: [], attendeeCount: 14, capacity: 30 },
    // Next week and beyond
    { id: "hf_6", schoolId, title: "FBLA Spirit Week Kickoff", description: "Daily challenges and extra XP awarded all week. Don't miss it!", location: "Main Hallway", category: "Social", startAt: weekday(7, 8), attendeeIds: [], attendeeCount: 35, capacity: 100 },
    { id: "hf_9", schoolId, title: "Entrepreneurship Pitch Night", description: "Final rehearsal pitches before the district event. Judges attending.", location: "Media Center", category: "FBLA", startAt: weekday(9, 17), attendeeIds: [], attendeeCount: 20, capacity: 40 },
    { id: "hf_10", schoolId, title: "Leadership Workshop", description: "Parliamentary procedure and running effective meetings.", location: "Room 301", category: "FBLA", startAt: weekday(11, 15), attendeeIds: [], attendeeCount: 22, capacity: 35 },
    { id: "hf_11", schoolId, title: "Networking Mixer", description: "Meet local business professionals and FBLA alumni.", location: "School Commons", category: "Social", startAt: weekday(14, 17), attendeeIds: [], attendeeCount: 19, capacity: 50 },
    { id: "hf_8", schoolId, title: "District Leadership Conference", description: "District-level competition. Top placers advance to SLC.", location: "Convention Center", category: "FBLA", startAt: weekday(28, 8), attendeeIds: [], attendeeCount: 45, capacity: 120 },
  ];
}

const DEMO_COMMENTS: Record<string, CommentItem[]> = {
  fp_1: [
    { id: "dc_fp1_1", postId: "fp_1", authorId: "demo_jordan_k", authorName: "Jordan K.", authorAvatarColor: "#6C63FF", content: "That's huge! 18 pages is no joke. What section gave you the most trouble?", createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString() },
    { id: "dc_fp1_2", postId: "fp_1", authorId: "demo_taylor_b", authorName: "Taylor B.", authorAvatarColor: "#FFD93D", content: "Business Plan is my event too! Good luck at SLC, would love to compare strategies sometime.", createdAt: new Date(Date.now() - 1000 * 60 * 38).toISOString() },
    { id: "dc_fp1_3", postId: "fp_1", authorId: "demo_sam_r", authorName: "Sam R.", authorAvatarColor: "#4ECDC4", content: "18 pages and 3 months — that kind of commitment shows. Judges will notice.", createdAt: new Date(Date.now() - 1000 * 60 * 31).toISOString() },
    { id: "dc_fp1_4", postId: "fp_1", authorId: "demo_riley_c", authorName: "Riley C.", authorAvatarColor: "#A8E6CF", content: "I'm also in Business Plan! Let's do a peer review session this week?", createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
    { id: "dc_fp1_5", postId: "fp_1", authorId: "demo_avery_n", authorName: "Avery N.", authorAvatarColor: "#45B7D1", content: "The executive summary is always the hardest part. Did you nail yours?", createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
    { id: "dc_fp1_6", postId: "fp_1", authorId: "demo_morgan_l", authorName: "Morgan L.", authorAvatarColor: "#6C63FF", content: "Fingers crossed for you! Post an update when results come out!", createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    { id: "dc_fp1_7", postId: "fp_1", authorId: "demo_piper_m", authorName: "Piper M.", authorAvatarColor: "#96CEB4", content: "What industry did you choose? Ours was sustainable fashion.", createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: "dc_fp1_8", postId: "fp_1", authorId: "demo_reese_o", authorName: "Reese O.", authorAvatarColor: "#DDA0DD", content: "This is so inspiring. Motivating me to finish my own draft tonight.", createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
  ],
  fp_2: [
    { id: "dc_fp2_1", postId: "fp_2", authorId: "demo_alex", authorName: "Alex M.", authorAvatarColor: "#FF8B94", content: "Already have my hotel booked for Atlanta! Can't wait.", createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString() },
    { id: "dc_fp2_2", postId: "fp_2", authorId: "demo_sam_r", authorName: "Sam R.", authorAvatarColor: "#4ECDC4", content: "That 30-second tip is gold. First impressions with judges are everything.", createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    { id: "dc_fp2_3", postId: "fp_2", authorId: "demo_riley_c", authorName: "Riley C.", authorAvatarColor: "#A8E6CF", content: "NLC is literally my dream. Two more qualifications to go!", createdAt: new Date(Date.now() - 1000 * 60 * 100).toISOString() },
    { id: "dc_fp2_4", postId: "fp_2", authorId: "demo_jordan_k", authorName: "Jordan K.", authorAvatarColor: "#6C63FF", content: "Does anyone know if Atlanta has good FBLA-friendly hotels near the convention center?", createdAt: new Date(Date.now() - 1000 * 60 * 85).toISOString() },
    { id: "dc_fp2_5", postId: "fp_2", authorId: "demo_taylor_b", authorName: "Taylor B.", authorAvatarColor: "#FFD93D", content: "The closing tip is so true. End strong, leave something memorable.", createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
    { id: "dc_fp2_6", postId: "fp_2", authorId: "demo_piper_m", authorName: "Piper M.", authorAvatarColor: "#96CEB4", content: "Started prepping for NLC last month. Stress levels: maximum.", createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
    { id: "dc_fp2_7", postId: "fp_2", authorId: "demo_morgan_l", authorName: "Morgan L.", authorAvatarColor: "#FF6B6B", content: "Register NOW — spots fill up. Don't wait.", createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: "dc_fp2_8", postId: "fp_2", authorId: "demo_avery_n", authorName: "Avery N.", authorAvatarColor: "#45B7D1", content: "Atlanta 2026 let's go! Who else is competing in Digital Video Production?", createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: "dc_fp2_9", postId: "fp_2", authorId: "demo_reese_o", authorName: "Reese O.", authorAvatarColor: "#DDA0DD", content: "The whole chapter is rallying. We're sending 12 members this year.", createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
    { id: "dc_fp2_10", postId: "fp_2", authorId: "demo_sam_r", authorName: "Sam R.", authorAvatarColor: "#4ECDC4", content: "Bookmark this post. Best NLC advice I've seen all season.", createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString() },
    { id: "dc_fp2_11", postId: "fp_2", authorId: "demo_riley_c", authorName: "Riley C.", authorAvatarColor: "#A8E6CF", content: "I hope the networking events are bigger this year. Met my best FBLA friends at NLC.", createdAt: new Date(Date.now() - 1000 * 60 * 1).toISOString() },
    { id: "dc_fp2_12", postId: "fp_2", authorId: "demo_jordan_k", authorName: "Jordan K.", authorAvatarColor: "#6C63FF", content: "Countdown: 106 days. Prep starts now.", createdAt: new Date(Date.now() - 1000 * 30).toISOString() },
    { id: "dc_fp2_13", postId: "fp_2", authorId: "demo_taylor_b", authorName: "Taylor B.", authorAvatarColor: "#FFD93D", content: "The FBLA Atlas practice tests are actually helping me prep for NLC.", createdAt: new Date(Date.now() - 1000 * 10).toISOString() },
    { id: "dc_fp2_14", postId: "fp_2", authorId: "demo_piper_m", authorName: "Piper M.", authorAvatarColor: "#96CEB4", content: "See everyone in Atlanta! 🏆", createdAt: new Date(Date.now() - 1000 * 5).toISOString() },
  ],
  fp_3: [
    { id: "dc_fp3_1", postId: "fp_3", authorId: "demo_morgan_l", authorName: "Morgan L.", authorAvatarColor: "#FF6B6B", content: "Recording yourself is brutal but literally the only way to catch filler words.", createdAt: new Date(Date.now() - 1000 * 60 * 280).toISOString() },
    { id: "dc_fp3_2", postId: "fp_3", authorId: "demo_alex", authorName: "Alex M.", authorAvatarColor: "#FF8B94", content: "3rd year qualifying — you're a legend. Any tips for first-timers?", createdAt: new Date(Date.now() - 1000 * 60 * 250).toISOString() },
    { id: "dc_fp3_3", postId: "fp_3", authorId: "demo_taylor_b", authorName: "Taylor B.", authorAvatarColor: "#FFD93D", content: "I used to hate watching myself back. Now it's the most useful thing I do.", createdAt: new Date(Date.now() - 1000 * 60 * 220).toISOString() },
    { id: "dc_fp3_4", postId: "fp_3", authorId: "demo_sam_r", authorName: "Sam R.", authorAvatarColor: "#4ECDC4", content: "I'd love feedback on my persuasive speech if the offer still stands!", createdAt: new Date(Date.now() - 1000 * 60 * 190).toISOString() },
    { id: "dc_fp3_5", postId: "fp_3", authorId: "demo_riley_c", authorName: "Riley C.", authorAvatarColor: "#A8E6CF", content: "The eye contact thing is so underrated. Judges want you to connect.", createdAt: new Date(Date.now() - 1000 * 60 * 160).toISOString() },
    { id: "dc_fp3_6", postId: "fp_3", authorId: "demo_jordan_k", authorName: "Jordan K.", authorAvatarColor: "#6C63FF", content: "DM'd you! Would love your feedback before regionals.", createdAt: new Date(Date.now() - 1000 * 60 * 130).toISOString() },
    { id: "dc_fp3_7", postId: "fp_3", authorId: "demo_avery_n", authorName: "Avery N.", authorAvatarColor: "#45B7D1", content: "Three years is serious dedication. Keep inspiring us!", createdAt: new Date(Date.now() - 1000 * 60 * 100).toISOString() },
    { id: "dc_fp3_8", postId: "fp_3", authorId: "demo_reese_o", authorName: "Reese O.", authorAvatarColor: "#DDA0DD", content: "Starting my recording sessions tonight because of this post.", createdAt: new Date(Date.now() - 1000 * 60 * 70).toISOString() },
    { id: "dc_fp3_9", postId: "fp_3", authorId: "demo_piper_m", authorName: "Piper M.", authorAvatarColor: "#96CEB4", content: "When can we schedule that feedback session? Let's set it up.", createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString() },
    { id: "dc_fp3_10", postId: "fp_3", authorId: "demo_morgan_l", authorName: "Morgan L.", authorAvatarColor: "#FF6B6B", content: "Congrats on 3 years! You're going to crush it again.", createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: "dc_fp3_11", postId: "fp_3", authorId: "demo_alex", authorName: "Alex M.", authorAvatarColor: "#FF8B94", content: "Record + review = the fastest way to level up. Confirmed.", createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  ],
  fp_4: [
    { id: "dc_fp4_1", postId: "fp_4", authorId: "demo_avery_n", authorName: "Avery N.", authorAvatarColor: "#45B7D1", content: "I'll be there! Advanced Accounting is kicking my butt this season.", createdAt: new Date(Date.now() - 1000 * 60 * 660).toISOString() },
    { id: "dc_fp4_2", postId: "fp_4", authorId: "demo_piper_m", authorName: "Piper M.", authorAvatarColor: "#96CEB4", content: "Yes! Finally someone organizing a group session. Accounting notes incoming.", createdAt: new Date(Date.now() - 1000 * 60 * 600).toISOString() },
    { id: "dc_fp4_3", postId: "fp_4", authorId: "demo_morgan_l", authorName: "Morgan L.", authorAvatarColor: "#FF6B6B", content: "What study materials are you using? Beechy and Conrod or something else?", createdAt: new Date(Date.now() - 1000 * 60 * 540).toISOString() },
    { id: "dc_fp4_4", postId: "fp_4", authorId: "demo_jordan_k", authorName: "Jordan K.", authorAvatarColor: "#6C63FF", content: "Timed rounds are the move. Simulates real test pressure perfectly.", createdAt: new Date(Date.now() - 1000 * 60 * 480).toISOString() },
    { id: "dc_fp4_5", postId: "fp_4", authorId: "demo_riley_c", authorName: "Riley C.", authorAvatarColor: "#A8E6CF", content: "Is this for Business Law too? I signed up for that one.", createdAt: new Date(Date.now() - 1000 * 60 * 420).toISOString() },
    { id: "dc_fp4_6", postId: "fp_4", authorId: "demo_sam_r", authorName: "Sam R.", authorAvatarColor: "#4ECDC4", content: "Count me in for Economics. See you Thursday!", createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString() },
  ],
  fp_5: [
    { id: "dc_fp5_1", postId: "fp_5", authorId: "demo_sam_r", authorName: "Sam R.", authorAvatarColor: "#4ECDC4", content: "Entrepreneurship teams are always the most creative. Can't wait to see your pitch!", createdAt: new Date(Date.now() - 1000 * 60 * 1100).toISOString() },
    { id: "dc_fp5_2", postId: "fp_5", authorId: "demo_taylor_b", authorName: "Taylor B.", authorAvatarColor: "#FFD93D", content: "The financials are always the hardest part. Nice work locking those in!", createdAt: new Date(Date.now() - 1000 * 60 * 1000).toISOString() },
    { id: "dc_fp5_3", postId: "fp_5", authorId: "demo_riley_c", authorName: "Riley C.", authorAvatarColor: "#A8E6CF", content: "What's the product? I'm dying to know!", createdAt: new Date(Date.now() - 1000 * 60 * 900).toISOString() },
    { id: "dc_fp5_4", postId: "fp_5", authorId: "demo_jordan_k", authorName: "Jordan K.", authorAvatarColor: "#6C63FF", content: "Love the energy! Market research done right is what separates good from great.", createdAt: new Date(Date.now() - 1000 * 60 * 800).toISOString() },
    { id: "dc_fp5_5", postId: "fp_5", authorId: "demo_avery_n", authorName: "Avery N.", authorAvatarColor: "#45B7D1", content: "\"Judges, we're coming for you\" 😂 This is the energy we all need!", createdAt: new Date(Date.now() - 1000 * 60 * 700).toISOString() },
    { id: "dc_fp5_6", postId: "fp_5", authorId: "demo_morgan_l", authorName: "Morgan L.", authorAvatarColor: "#FF6B6B", content: "Good luck! Your confidence alone is a competitive advantage.", createdAt: new Date(Date.now() - 1000 * 60 * 600).toISOString() },
    { id: "dc_fp5_7", postId: "fp_5", authorId: "demo_reese_o", authorName: "Reese O.", authorAvatarColor: "#DDA0DD", content: "The whole chapter is rooting for your team!", createdAt: new Date(Date.now() - 1000 * 60 * 500).toISOString() },
    { id: "dc_fp5_8", postId: "fp_5", authorId: "demo_piper_m", authorName: "Piper M.", authorAvatarColor: "#96CEB4", content: "Tag us when you find out results! We want to celebrate.", createdAt: new Date(Date.now() - 1000 * 60 * 400).toISOString() },
    { id: "dc_fp5_9", postId: "fp_5", authorId: "demo_alex", authorName: "Alex M.", authorAvatarColor: "#FF8B94", content: "Did you use any specific frameworks for the business model?", createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString() },
  ],
  fp_6: [
    { id: "dc_fp6_1", postId: "fp_6", authorId: "demo_piper_m", authorName: "Piper M.", authorAvatarColor: "#96CEB4", content: "Thanks for the heads up! Just confirmed my events with Mrs. Rodriguez.", createdAt: new Date(Date.now() - 1000 * 60 * 1600).toISOString() },
    { id: "dc_fp6_2", postId: "fp_6", authorId: "demo_morgan_l", authorName: "Morgan L.", authorAvatarColor: "#FF6B6B", content: "I almost missed the deadline last year. Always pinning these reminders!", createdAt: new Date(Date.now() - 1000 * 60 * 1400).toISOString() },
    { id: "dc_fp6_3", postId: "fp_6", authorId: "demo_reese_o", authorName: "Reese O.", authorAvatarColor: "#DDA0DD", content: "How do I know if my event slot is confirmed? Is there a list?", createdAt: new Date(Date.now() - 1000 * 60 * 1200).toISOString() },
    { id: "dc_fp6_4", postId: "fp_6", authorId: "demo_avery_n", authorName: "Avery N.", authorAvatarColor: "#45B7D1", content: "Public Speaking is almost at capacity? I need to move fast.", createdAt: new Date(Date.now() - 1000 * 60 * 1000).toISOString() },
    { id: "dc_fp6_5", postId: "fp_6", authorId: "demo_taylor_b", authorName: "Taylor B.", authorAvatarColor: "#FFD93D", content: "Appreciate these updates! Chapter communication is so much better this year.", createdAt: new Date(Date.now() - 1000 * 60 * 800).toISOString() },
    { id: "dc_fp6_6", postId: "fp_6", authorId: "demo_sam_r", authorName: "Sam R.", authorAvatarColor: "#4ECDC4", content: "Who's in Business Law? Let's form a study group before DLC.", createdAt: new Date(Date.now() - 1000 * 60 * 600).toISOString() },
    { id: "dc_fp6_7", postId: "fp_6", authorId: "demo_jordan_k", authorName: "Jordan K.", authorAvatarColor: "#6C63FF", content: "Got it. Confirming with the advisor today. Thanks for the reminder!", createdAt: new Date(Date.now() - 1000 * 60 * 400).toISOString() },
  ],
};

const DISMISSED_ANNOUNCEMENT_KEY = "fbla_atlas_dismissed_announcement_v1";
const LAST_PUSHED_ANNOUNCEMENT_KEY = "fbla_atlas_last_pushed_announcement_v1";
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function dayGreeting(name: string): string {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${prefix}, ${name}`;
}

function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeekMonday(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function shortMonthDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function categoryPill(themeCategory: EventItem["category"], accent: string) {
  const category = themeCategory ?? "FBLA";
  switch (category) {
    case "Sports":
      return { label: "Sports", color: "#22c55e" };
    case "Academic":
      return { label: "Academic", color: "#3b82f6" };
    case "Social":
      return { label: "Social", color: "#ec4899" };
    case "Arts":
      return { label: "Arts", color: "#a855f7" };
    case "FBLA":
    default:
      return { label: category, color: accent };
  }
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, loading: authLoading } = useAuthContext();
  const { settings, updateSettings } = useSettings();
  const { focusMode, setFocusMode } = useAccessibility();
  const { enabled: pushEnabled } = usePushNotifications();
  const { palette } = useThemeContext();
  const { onScroll, onScrollBeginDrag, scrollEventThrottle } = useNavBarScroll();
  const permissions = usePermissions();
  const canManageTasks = permissions.canManageTasks();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [commentModalPost, setCommentModalPost] = useState<PostItem | null>(null);
  const [expandedComments, setExpandedComments] = useState<CommentItem[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const commentSubRef = useRef<(() => void) | null>(null);
  // 0 = fully visible, 1 = fully hidden (collapsed)
  const commentInputVisible = useSharedValue(0);
  const lastCommentScrollY = useRef(0);
  const animatedCommentInputStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(commentInputVisible.value, [0, 1], [200, 0]),
    opacity: interpolate(commentInputVisible.value, [0, 0.5, 1], [1, 0.4, 0]),
    overflow: "hidden",
  }));
  const [events, setEvents] = useState<EventItem[]>([]);
  const [announcement, setAnnouncement] = useState<AnnouncementItem | null>(null);
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState("");
  const [incomingChallenges, setIncomingChallenges] = useState<PracticeChallenge[]>([]);
  const [recognitionRows, setRecognitionRows] = useState<RecognitionPlacement[]>([]);
  const [chapterGoals, setChapterGoals] = useState<ChapterGoal[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [officerTasks, setOfficerTasks] = useState<OfficerTask[]>([]);
  const [assignedActions, setAssignedActions] = useState<Array<MeetingActionItem & { meetingDate: string }>>([]);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("10");

  useEffect(() => {
    let mounted = true;
    const loadDismissed = async () => {
      try {
        const stored = (await AsyncStorage.getItem(DISMISSED_ANNOUNCEMENT_KEY)) ?? "";
        if (mounted) {
          setDismissedAnnouncementId(stored);
        }
      } catch (error) {
        console.warn("Failed loading dismissed announcement state:", error);
      }
    };
    void loadDismissed();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [schoolPosts, schoolEvents] = await Promise.all([
          fetchPostsOnce(profile.schoolId),
          fetchEventsOnce(profile.schoolId),
        ]);
        if (cancelled) {
          return;
        }
        const resolvedPosts = schoolPosts.length > 0 ? schoolPosts.slice(0, 6) : buildFallbackPosts(profile.schoolId);
        setPosts(resolvedPosts);
        setLikedPostIds(new Set(resolvedPosts.filter((p) => p.likedBy.includes(profile.uid)).map((p) => p.id)));
        // Only use real events if there are upcoming ones; otherwise show fallbacks
        const nowMs = Date.now();
        const futureReal = schoolEvents.filter((e) => new Date(e.startAt).getTime() >= nowMs);
        const resolvedEvents = futureReal.length > 0 ? schoolEvents : buildHomeFallbackEvents(profile.schoolId);
        setEvents(
          [...resolvedEvents].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
        );

        const latestAnnouncement = await fetchLatestAnnouncement();
        if (!cancelled) {
          setAnnouncement(latestAnnouncement);
        }
        if (profile.chapterId) {
          const meetingNotes = await fetchMeetingNotes(profile.chapterId);
          if (!cancelled) {
            const reminders = meetingNotes
              .flatMap((note) =>
                note.actionItems.map((item) => ({
                  ...item,
                  meetingDate: note.meetingDate,
                })),
              )
              .filter((item) => item.assigneeUid === profile.uid && !item.done)
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .slice(0, 5);
            setAssignedActions(reminders);
          }
        } else if (!cancelled) {
          setAssignedActions([]);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Home feed load failed:", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [profile?.schoolId, profile?.uid]);

  useEffect(() => {
    if (!profile?.uid) {
      setIncomingChallenges([]);
      return;
    }
    const unsubscribe = subscribeIncomingChallenges(profile.uid, setIncomingChallenges);
    return unsubscribe;
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.schoolId) {
      setRecognitionRows([]);
      return;
    }
    const unsubscribe = subscribeRecognitionPlacements(profile.schoolId, setRecognitionRows);
    return unsubscribe;
  }, [profile?.schoolId]);

  useEffect(() => {
    if (!profile?.chapterId) {
      setChapterGoals([]);
      return;
    }
    const unsubscribe = subscribeChapterGoals(profile.chapterId, setChapterGoals);
    return unsubscribe;
  }, [profile?.chapterId]);

  useEffect(() => {
    if (!profile?.schoolId) {
      setStudySessions([]);
      return;
    }
    const unsubscribe = subscribeStudySessions(profile.schoolId, setStudySessions);
    return unsubscribe;
  }, [profile?.schoolId]);

  useEffect(() => {
    if (!profile?.chapterId || !canManageTasks) {
      setOfficerTasks((prev) => (prev.length > 0 ? [] : prev));
      return;
    }
    const unsubscribe = subscribeOfficerTasks(profile.chapterId, setOfficerTasks);
    return unsubscribe;
  }, [canManageTasks, profile?.chapterId]);

  useEffect(() => {
    if (!announcement || !profile) {
      return;
    }
    if (!settings.notifications.globalPush || !settings.notifications.chapterUpdates || !pushEnabled) {
      return;
    }

    let cancelled = false;
    const notify = async () => {
      try {
        const storageKey = `${LAST_PUSHED_ANNOUNCEMENT_KEY}_${profile.uid}`;
        const lastPushedId = await AsyncStorage.getItem(storageKey);
        if (cancelled || lastPushedId === announcement.id) {
          return;
        }
        await sendLocalPush("Chapter Update", announcement.message);
        await AsyncStorage.setItem(storageKey, announcement.id);
      } catch (error) {
        console.warn("Chapter update push failed:", error);
      }
    };

    void notify();
    return () => {
      cancelled = true;
    };
  }, [
    announcement,
    profile,
    pushEnabled,
    settings.notifications.chapterUpdates,
    settings.notifications.globalPush,
  ]);

  // Cleanup comment subscription on unmount
  useEffect(() => () => { commentSubRef.current?.(); }, []);

  const openCommentModal = (post: PostItem) => {
    commentSubRef.current?.();
    commentInputVisible.value = 0;
    lastCommentScrollY.current = 0;
    setCommentModalPost(post);
    setCommentInput("");
    const isDemo = post.authorId.startsWith("demo_") || post.authorId === "seed_fbla_atlas";
    if (isDemo && DEMO_COMMENTS[post.id]) {
      setExpandedComments(DEMO_COMMENTS[post.id]);
      commentSubRef.current = null;
    } else {
      setExpandedComments([]);
      commentSubRef.current = subscribePostComments(post.id, (items) => setExpandedComments(items));
    }
  };

  const closeCommentModal = () => {
    commentSubRef.current?.();
    commentSubRef.current = null;
    setCommentModalPost(null);
    setExpandedComments([]);
    setCommentInput("");
    setReplyingTo(null);
  };

  const handleLikePost = async (post: PostItem) => {
    if (!profile) return;
    hapticTap();
    const wasLiked = likedPostIds.has(post.id);
    setLikedPostIds((prev) => { const n = new Set(prev); wasLiked ? n.delete(post.id) : n.add(post.id); return n; });
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, likeCount: wasLiked ? p.likeCount - 1 : p.likeCount + 1 } : p));
    try {
      await toggleLikeOnPost(post, profile);
    } catch {
      setLikedPostIds((prev) => { const n = new Set(prev); wasLiked ? n.add(post.id) : n.delete(post.id); return n; });
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, likeCount: wasLiked ? p.likeCount + 1 : p.likeCount - 1 } : p));
    }
  };

  const handleAddComment = async () => {
    if (!profile || !commentInput.trim() || submittingComment || !commentModalPost) return;
    const post = commentModalPost;
    const text = replyingTo
      ? `@${replyingTo.name} ${commentInput.trim()}`
      : commentInput.trim();
    setCommentInput("");
    setReplyingTo(null);
    setSubmittingComment(true);
    try {
      await addCommentToPost(post, profile, text);
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, commentCount: p.commentCount + 1 } : p));
      setCommentModalPost((prev) => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
    } catch {
      setCommentInput(text);
    } finally {
      setSubmittingComment(false);
    }
  };

  const visibleQuickActions = useMemo(
    () =>
      focusMode
        ? [
            { id: "practice", label: "Practice", route: "Practice" as keyof RootStackParamList, color: "#4A90D9" },
            { id: "events", label: "Events", route: "Events" as keyof RootStackParamList, color: "#27AE60" },
            { id: "finn", label: "Finn", route: "Finn" as keyof RootStackParamList, color: "#9B59B6" },
          ]
        : QUICK_ACTIONS,
    [focusMode],
  );
  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events
      .filter((event) => new Date(event.startAt).getTime() >= now)
      .slice(0, 2);
  }, [events]);
  const weekDays = useMemo(() => {
    const start = startOfWeekMonday(new Date());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, []);
  const thisWeekEventKeys = useMemo(() => {
    const start = weekDays[0];
    const end = new Date(weekDays[6]);
    end.setHours(23, 59, 59, 999);
    return new Set(
      events
        .filter((event) => {
          const eventTime = new Date(event.startAt).getTime();
          return eventTime >= start.getTime() && eventTime <= end.getTime();
        })
        .map((event) => toDayKey(new Date(event.startAt))),
    );
  }, [events, weekDays]);

  if (authLoading || !profile) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 24, backgroundColor: palette.colors.background }}>
        <SkeletonCard height={140} />
        <SkeletonCard height={140} />
        <SkeletonCard height={140} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.colors.background }}>
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: palette.colors.background }}>
      <LinearGradient
        pointerEvents="none"
        colors={
          palette.isDark
            ? [palette.colors.background, palette.colors.surfaceAlt]
            : [palette.colors.background, palette.colors.surface]
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 28, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={scrollEventThrottle}
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBeginDrag}
      >
        {announcement && announcement.id !== dismissedAnnouncementId ? (
          <GlassSurface
            style={{
              padding: 16,
              marginBottom: 20,
              backgroundColor: palette.colors.surface,
              borderRadius: 16,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: palette.colors.textMuted,
                    fontSize: 12,
                    fontWeight: "600",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                  }}
                >
                  Announcement
                </Text>
                <Text style={{ color: palette.colors.text, marginTop: 4, fontSize: 14 }}>
                  {announcement.message}
                </Text>
                <Text style={{ color: palette.colors.textMuted, marginTop: 4, fontSize: 12 }}>
                  Posted by {announcement.createdBy}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setDismissedAnnouncementId(announcement.id);
                  void AsyncStorage.setItem(DISMISSED_ANNOUNCEMENT_KEY, announcement.id);
                }}
                style={{ minWidth: 32, minHeight: 32, alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} color={palette.colors.textMuted} />
              </Pressable>
            </View>
          </GlassSurface>
        ) : null}

        {focusMode ? (
          <GlassSurface
            style={{
              padding: 14,
              marginBottom: 20,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: palette.colors.border,
              backgroundColor: palette.colors.surfaceAlt,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Text style={{ color: palette.colors.textSecondary, flex: 1 }}>Focus Mode is on</Text>
            <Pressable
              onPress={() => {
                setFocusMode(false);
                void updateSettings((prev) => ({
                  ...prev,
                  accessibility: { ...prev.accessibility, focusMode: false },
                }));
              }}
              style={{ minHeight: 36, justifyContent: "center", paddingHorizontal: 8 }}
            >
              <Text style={{ color: palette.colors.primary, fontWeight: "700" }}>Disable</Text>
            </Pressable>
          </GlassSurface>
        ) : null}

        <View
          style={{
            position: "relative",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            borderRadius: 16,
            overflow: "hidden",
            paddingHorizontal: 16,
            paddingVertical: 18,
          }}
        >
          {palette.isDark ? (
            <LinearGradient
              pointerEvents="none"
              colors={[palette.colors.surface, palette.colors.transparent]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ position: "absolute", left: 0, right: 0, top: 0, height: 80 }}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <AppLogo size={22} />
            <View style={{ height: 14 }} />
            <Text style={{ color: palette.colors.text, fontWeight: "700", fontSize: 22 }}>
              {dayGreeting(profile.displayName.split(" ")[0])}
            </Text>
            <Text style={{ color: palette.colors.textMuted, marginTop: 6, fontSize: 14 }}>
              FBLA updates and chapter activity
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <NotificationBell />
            <AvatarWithStatus
              uri={profile.avatarUrl}
              seed={profile.displayName}
              size={34}
              online={false}
              tier={profile.tier}
              avatarColor={profile.avatarColor || undefined}
              onPress={() => {
                hapticTap();
                navigation.navigate("Profile");
              }}
            />
          </View>
        </View>

        <View style={{ gap: 12, marginBottom: 24 }}>
          {[visibleQuickActions.slice(0, 2), visibleQuickActions.slice(2, 4)].map((row, rowIdx) => (
            <View key={rowIdx} style={{ flexDirection: "row", gap: 12 }}>
              {row.map((action) => {
                const iconMap = {
                  find_members: Users,
                  conferences: SearchIcon,
                  leaderboard: Trophy,
                  create_post: PenSquare,
                } as Record<string, React.ComponentType<{ size: number; color: string; strokeWidth: number }>>;
                const Icon = iconMap[action.id];
                return (
                  <Pressable
                    key={action.id}
                    onPress={() => navigation.navigate(action.route as never)}
                    style={{ flex: 1, minHeight: 68 }}
                  >
                    {({ pressed }) => (
                      <GlassSurface
                        pressed={pressed}
                        style={{
                          flex: 1,
                          minHeight: 68,
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "row",
                          gap: 8,
                          backgroundColor: palette.colors.surface,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: action.color + "44",
                          borderTopWidth: 2,
                          borderTopColor: action.color + "99",
                        }}
                      >
                        {Icon ? <Icon size={15} color={action.color} strokeWidth={2.2} /> : null}
                        <Text style={{ color: palette.colors.text, fontWeight: "600", fontSize: 13 }}>
                          {action.label}
                        </Text>
                      </GlassSurface>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => navigation.navigate("Events")}
          style={{ marginBottom: 24 }}
          accessibilityRole="button"
          accessibilityLabel="Open full events page"
        >
          {({ pressed }) => (
            <GlassSurface
              pressed={pressed}
              style={{
                padding: 20,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: palette.colors.border,
                backgroundColor: palette.colors.surface,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ color: palette.colors.text, fontWeight: "700", fontSize: 15 }}>
                    Events
                  </Text>
                  {events.length > 0 ? (
                    <View style={{ backgroundColor: palette.colors.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                        +{events.length}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ color: palette.colors.primary, fontWeight: "700", fontSize: 12 }}>
                  See All →
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 16, marginTop: 20 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: palette.colors.textMuted, fontSize: 12, marginBottom: 6 }}>
                    {new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    {WEEKDAY_LABELS.map((label) => (
                      <Text key={label} style={{ width: `${100 / 7}%`, textAlign: "center", color: palette.colors.textMuted, fontSize: 11 }}>
                        {label}
                      </Text>
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    {weekDays.map((date) => {
                      const isToday = toDayKey(date) === toDayKey(new Date());
                      const hasEvent = thisWeekEventKeys.has(toDayKey(date));
                      return (
                        <View key={toDayKey(date)} style={{ width: `${100 / 7}%`, alignItems: "center" }}>
                          <View
                            style={{
                              minWidth: 24,
                              minHeight: 24,
                              borderRadius: 999,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: isToday ? palette.colors.primary : palette.colors.transparent,
                            }}
                          >
                            <Text style={{ color: isToday ? palette.colors.onPrimary : palette.colors.text, fontSize: 12, fontWeight: "600" }}>
                              {date.getDate()}
                            </Text>
                          </View>
                          <View
                            style={{
                              marginTop: 3,
                              width: 5,
                              height: 5,
                              borderRadius: 999,
                              backgroundColor: hasEvent ? palette.colors.primary : palette.colors.transparent,
                            }}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
                <View style={{ flex: 1.3, minWidth: 0, gap: 8 }}>
                  {upcomingEvents.length === 0 ? (
                    <Text style={{ color: palette.colors.textMuted, fontSize: 13 }}>No upcoming events</Text>
                  ) : (
                    upcomingEvents.map((event) => {
                      const categoryMeta = categoryPill(event.category, palette.colors.accent);
                      return (
                        <View key={event.id} style={{ borderBottomWidth: 1, borderBottomColor: palette.colors.divider, paddingBottom: 6 }}>
                          <Text numberOfLines={1} style={{ color: palette.colors.text, fontWeight: "700", fontSize: 14 }}>
                            {event.title}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 }}>
                            <Text style={{ color: palette.colors.textMuted, fontSize: 12 }}>{shortMonthDay(event.startAt)}</Text>
                            <View
                              style={{
                                borderRadius: 999,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                backgroundColor: `${categoryMeta.color}22`,
                                borderWidth: 1,
                                borderColor: `${categoryMeta.color}66`,
                              }}
                            >
                              <Text style={{ color: categoryMeta.color, fontSize: 10, fontWeight: "700" }}>
                                {categoryMeta.label}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            </GlassSurface>
          )}
        </Pressable>

        {incomingChallenges.length > 0 ? (
          <GlassSurface style={{ padding: 16, marginBottom: 24 }}>
            <Text
              style={{
                color: palette.colors.text,
                fontWeight: "800",
                marginBottom: 12,
                letterSpacing: 0.8,
                fontSize: 15,
                textTransform: "uppercase",
              }}
            >
              Practice Challenges
            </Text>
            {incomingChallenges.slice(0, 3).map((challenge) => (
              <GlassSurface key={challenge.id} style={{ padding: 14, marginBottom: 10 }}>
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                  {challenge.challengerName} challenged you
                </Text>
                <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
                  {challenge.eventName} - expires in 24h
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <GlassButton
                    variant="solid"
                    size="sm"
                    label="Accept"
                    style={{ flex: 1 }}
                    onPress={async () => {
                    await respondToChallenge(challenge.id, true);
                    navigation.navigate("PracticeEventHub", {
                      eventId: challenge.eventId,
                      mode: "objective_test",
                      challengeId: challenge.id,
                    });
                  }}
                />
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    label="Decline"
                    style={{ flex: 1 }}
                    onPress={async () => {
                      await respondToChallenge(challenge.id, false);
                    }}
                  />
                </View>
              </GlassSurface>
            ))}
          </GlassSurface>
        ) : null}

        {recognitionRows.length > 0 ? (
          <GlassSurface style={{ padding: 16, marginBottom: 24 }}>
            <Text
              style={{
                color: palette.colors.text,
                fontWeight: "800",
                marginBottom: 12,
                letterSpacing: 0.8,
                fontSize: 15,
                textTransform: "uppercase",
              }}
            >
              Chapter Wins
            </Text>
            {recognitionRows.slice(0, 3).map((item) => (
              <View key={item.id} style={{ paddingVertical: 16, borderTopWidth: 1, borderTopColor: palette.colors.divider }}>
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                  {item.userName} placed {item.place}
                </Text>
                <Text style={{ color: palette.colors.textSecondary }}>
                  {item.eventName} • {item.level} {item.year} • {item.verified ? "Verified" : "Pending"}
                </Text>
              </View>
            ))}
          </GlassSurface>
        ) : null}

        {chapterGoals.length > 0 || permissions.canManageTasks() ? (
          <GlassSurface style={{ padding: 16, marginBottom: 24 }}>
            <Text
              style={{
                color: palette.colors.text,
                fontWeight: "800",
                marginBottom: 12,
                letterSpacing: 0.8,
                fontSize: 15,
                textTransform: "uppercase",
              }}
            >
              Chapter Goals
            </Text>
            {permissions.canManageTasks() && profile.chapterId ? (
              <GlassSurface style={{ padding: 14, marginBottom: 10 }}>
                <GlassInput
                  value={newGoalTitle}
                  onChangeText={setNewGoalTitle}
                  placeholder="New chapter goal title"
                />
                <GlassInput
                  containerStyle={{ marginTop: 8 }}
                  value={newGoalTarget}
                  onChangeText={setNewGoalTarget}
                  placeholder="Target"
                  keyboardType="numeric"
                />
                <GlassButton
                  variant="solid"
                  size="sm"
                  label="Create Goal"
                  style={{ marginTop: 8, alignSelf: "flex-start" }}
                  onPress={async () => {
                    const target = Number(newGoalTarget);
                    if (!newGoalTitle.trim() || !Number.isFinite(target) || target <= 0) {
                      return;
                    }
                    try {
                      await createChapterGoal(profile, {
                        title: newGoalTitle.trim(),
                        target,
                        unit: "items",
                        deadline: "",
                        category: "General",
                      });
                      setNewGoalTitle("");
                      setNewGoalTarget("10");
                      Keyboard.dismiss();
                    } catch (error) {
                      console.warn("Create goal failed:", error);
                    }
                  }}
                />
              </GlassSurface>
            ) : null}
            {chapterGoals.slice(0, 3).map((goal) => {
              const progress = goal.target > 0 ? Math.min(1, goal.progress / goal.target) : 0;
              return (
                <GlassSurface key={goal.id} style={{ padding: 14, marginBottom: 10 }}>
                  <Text style={{ color: palette.colors.text, fontWeight: "700" }}>{goal.title}</Text>
                  <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
                    {goal.progress}/{goal.target} {goal.unit} • due {goal.deadline}
                  </Text>
                  <View style={{ height: 8, borderRadius: 999, marginTop: 8, backgroundColor: palette.colors.inputMuted, overflow: "hidden" }}>
                    <View style={{ width: `${Math.round(progress * 100)}%`, height: 8, backgroundColor: palette.colors.primary }} />
                  </View>
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    label="+1 Contribution"
                    style={{ marginTop: 8, alignSelf: "flex-start" }}
                    onPress={async () => {
                      try {
                        await submitGoalContribution(profile, goal.id, 1, "Quick contribution log");
                      } catch (error) {
                        console.warn("Goal contribution failed:", error);
                      }
                    }}
                  />
                </GlassSurface>
              );
            })}
            {chapterGoals.length === 0 ? (
              <Text style={{ color: palette.colors.textSecondary }}>No goals yet.</Text>
            ) : null}
          </GlassSurface>
        ) : null}

        {studySessions.length > 0 ? (
          <GlassSurface style={{ padding: 16, marginBottom: 24 }}>
            <Text
              style={{
                color: palette.colors.text,
                fontWeight: "800",
                marginBottom: 12,
                letterSpacing: 0.8,
                fontSize: 15,
                textTransform: "uppercase",
              }}
            >
              Group Study Live
            </Text>
            {studySessions.slice(0, 3).map((session) => (
              <GlassSurface key={session.id} style={{ padding: 14, marginBottom: 10 }}>
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                  {session.createdByName} is studying {session.eventNames.join(", ") || "FBLA"}
                </Text>
                <Text style={{ color: palette.colors.textSecondary, marginTop: 2 }}>
                  {session.participantIds.length} members - {session.mode === "practice_together" ? "Practice Together" : "Quiz Each Other"}
                </Text>
                <GlassButton
                  variant="solid"
                  size="sm"
                  label="Join"
                  style={{ marginTop: 8, alignSelf: "flex-start" }}
                  onPress={async () => {
                    try {
                      await joinStudySession(session.id, profile);
                    } catch (error) {
                      console.warn("Join session failed:", error);
                    }
                    navigation.navigate("StudySession", { sessionId: session.id });
                  }}
                />
              </GlassSurface>
            ))}
          </GlassSurface>
        ) : null}

        {permissions.canManageTasks() && officerTasks.length > 0 ? (
          <GlassSurface style={{ padding: 16, marginBottom: 24 }}>
            <Text
              style={{
                color: palette.colors.text,
                fontWeight: "800",
                marginBottom: 12,
                letterSpacing: 0.8,
                fontSize: 15,
                textTransform: "uppercase",
              }}
            >
              Officer Tasks
            </Text>
            <Text style={{ color: palette.colors.textSecondary, marginBottom: 8 }}>
              You have {officerTasks.filter((task) => task.status !== "done").length} tasks pending.
            </Text>
            <GlassButton variant="ghost" size="sm" label="Open Task Board" onPress={() => navigation.navigate("OfficerTasks")} />
          </GlassSurface>
        ) : null}

        {assignedActions.length > 0 ? (
          <GlassSurface style={{ padding: 16, marginBottom: 24 }}>
            <Text
              style={{
                color: palette.colors.text,
                fontWeight: "800",
                marginBottom: 12,
                letterSpacing: 0.8,
                fontSize: 15,
                textTransform: "uppercase",
              }}
            >
              Action Items
            </Text>
            {assignedActions.map((item) => (
              <GlassSurface key={item.id} style={{ padding: 10, marginBottom: 8 }}>
                <Text style={{ color: palette.colors.text, fontWeight: "700" }}>
                  You have an action item due {item.dueDate || "soon"}
                </Text>
                <Text style={{ color: palette.colors.textSecondary, marginTop: 4 }}>
                  {item.text}
                </Text>
                <Text style={{ color: palette.colors.textSecondary, marginTop: 4, fontSize: 12 }}>
                  From meeting {item.meetingDate}
                </Text>
              </GlassSurface>
            ))}
          </GlassSurface>
        ) : null}

        {!focusMode && settings.customize.showStoriesBar ? <FblaSocialSection /> : null}

        {!focusMode && settings.customize.showSocialFeed ? (
          <GlassSurface style={{ padding: 16, backgroundColor: palette.colors.surface, borderRadius: 16 }}>
            <Text
              style={{
                color: palette.colors.textMuted,
                fontWeight: "600",
                marginTop: 20,
                marginBottom: 10,
                letterSpacing: 0.8,
                fontSize: 13,
                textTransform: "uppercase",
              }}
            >
              Latest Feed
            </Text>
            {loading ? (
              <View style={{ paddingTop: 4 }}>
                <SkeletonCard height={74} />
                <SkeletonCard height={74} />
                <SkeletonCard height={74} />
              </View>
            ) : posts.length === 0 ? (
              <EmptyState title="No Posts Yet" message="Your chapter feed is empty right now." />
            ) : (
              posts.map((post, index) => {
                const isLiked = likedPostIds.has(post.id);
                return (
                <View
                  key={post.id}
                  style={{
                    paddingTop: index === 0 ? 0 : 12,
                    marginTop: index === 0 ? 0 : 12,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: palette.colors.divider,
                  }}
                >
                  {/* Header row */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <Pressable
                      style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}
                      onPress={() => {
                        if (!post.authorId.startsWith("demo_") && post.authorId !== "seed_fbla_atlas") {
                          navigation.navigate("StudentProfile", { userId: post.authorId });
                        }
                      }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: post.authorAvatarColor, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>
                          {post.authorName.charAt(0)}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ color: palette.colors.text, fontWeight: "700", fontSize: 13 }}>{post.authorName}</Text>
                        <Text style={{ color: palette.colors.textMuted, fontSize: 11 }}>
                          {formatRelativeDateTime(post.createdAt)}
                        </Text>
                      </View>
                    </Pressable>
                    {post.tags && post.tags.length > 0 ? (
                      <View style={{ backgroundColor: palette.colors.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ color: palette.colors.primary, fontSize: 11, fontWeight: "600" }}>{post.tags[0]}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Post image — tappable */}
                  {post.imageUrl ? (
                    <Pressable onPress={() => openCommentModal(post)}>
                      <Image
                        source={{ uri: post.imageUrl }}
                        style={{ width: "100%", height: 180, borderRadius: 12, marginBottom: 8 }}
                        contentFit="cover"
                        transition={300}
                      />
                    </Pressable>
                  ) : null}

                  {/* Content — tappable to open full post */}
                  <Pressable onPress={() => openCommentModal(post)}>
                    <Text style={{ color: palette.colors.text, fontSize: 14, lineHeight: 20 }}>{post.content}</Text>
                    <Text style={{ color: palette.colors.primary, fontSize: 12, marginTop: 4, fontWeight: "600" }}>
                      View all {post.commentCount} comments
                    </Text>
                  </Pressable>

                  {/* Like / comment action row */}
                  <View style={{ flexDirection: "row", gap: 16, marginTop: 10, alignItems: "center" }}>
                    <Pressable
                      onPress={() => void handleLikePost(post)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                    >
                      <Heart
                        size={17}
                        color={isLiked ? "#ef4444" : palette.colors.textMuted}
                        fill={isLiked ? "#ef4444" : "transparent"}
                      />
                      <Text style={{ color: isLiked ? "#ef4444" : palette.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                        {post.likeCount}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => openCommentModal(post)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                    >
                      <MessageCircleIcon size={17} color={palette.colors.textMuted} />
                      <Text style={{ color: palette.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                        {post.commentCount}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
              })
            )}
          </GlassSurface>
        ) : null}
      </ScrollView>

      {/* Post Detail Modal */}
      <Modal
        visible={commentModalPost !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCommentModal}
      >
        <View style={{ flex: 1, backgroundColor: palette.colors.background }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            {/* Drag handle */}
            <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 2 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.colors.border }} />
            </View>

            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) => {
                const y = e.nativeEvent.contentOffset.y;
                const delta = y - lastCommentScrollY.current;
                lastCommentScrollY.current = y;
                if (delta > 8 && y > 60) {
                  commentInputVisible.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
                } else if (delta < -6) {
                  commentInputVisible.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
                }
              }}
            >
              {commentModalPost ? (
                <>
                  {/* Hero image with gradient fade */}
                  {commentModalPost.imageUrl ? (
                    <View style={{ position: "relative", marginBottom: 0 }}>
                      <Image
                        source={{ uri: commentModalPost.imageUrl }}
                        style={{ width: "100%", height: 260 }}
                        contentFit="cover"
                        transition={300}
                      />
                      <LinearGradient
                        pointerEvents="none"
                        colors={["transparent", palette.colors.background]}
                        start={{ x: 0, y: 0.4 }}
                        end={{ x: 0, y: 1 }}
                        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 130 }}
                      />
                      {/* Close button floating on image */}
                      <Pressable
                        onPress={closeCommentModal}
                        style={{
                          position: "absolute", top: 14, right: 14,
                          width: 34, height: 34, borderRadius: 17,
                          backgroundColor: "rgba(0,0,0,0.45)",
                          alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <X size={18} color="#fff" />
                      </Pressable>
                    </View>
                  ) : (
                    /* No image — show close button in a regular header */
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingVertical: 10 }}>
                      <Pressable onPress={closeCommentModal} style={{ padding: 4 }}>
                        <X size={22} color={palette.colors.text} />
                      </Pressable>
                    </View>
                  )}

                  {/* Author row */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: commentModalPost.imageUrl ? 0 : 4, paddingBottom: 12 }}>
                    <Pressable
                      onPress={() => {
                        if (!commentModalPost.authorId.startsWith("demo_") && commentModalPost.authorId !== "seed_fbla_atlas") {
                          closeCommentModal();
                          navigation.navigate("StudentProfile", { userId: commentModalPost.authorId });
                        }
                      }}
                    >
                      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: commentModalPost.authorAvatarColor, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: palette.colors.border }}>
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{commentModalPost.authorName.charAt(0)}</Text>
                      </View>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.colors.text, fontWeight: "800", fontSize: 15 }}>{commentModalPost.authorName}</Text>
                      <Text style={{ color: palette.colors.textMuted, fontSize: 12, marginTop: 1 }}>{formatRelativeDateTime(commentModalPost.createdAt)}</Text>
                    </View>
                    {/* Like button */}
                    <Pressable
                      onPress={() => void handleLikePost(commentModalPost)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: likedPostIds.has(commentModalPost.id) ? "#ef444422" : palette.colors.surface, borderWidth: 1, borderColor: likedPostIds.has(commentModalPost.id) ? "#ef4444" : palette.colors.border }}
                    >
                      <Heart size={15} color={likedPostIds.has(commentModalPost.id) ? "#ef4444" : palette.colors.textMuted} fill={likedPostIds.has(commentModalPost.id) ? "#ef4444" : "transparent"} />
                      <Text style={{ color: likedPostIds.has(commentModalPost.id) ? "#ef4444" : palette.colors.textMuted, fontWeight: "700", fontSize: 13 }}>{commentModalPost.likeCount}</Text>
                    </Pressable>
                  </View>

                  {/* Full post content */}
                  <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                    <Text style={{ color: palette.colors.text, fontSize: 16, lineHeight: 24, fontWeight: "400" }}>
                      {commentModalPost.content}
                    </Text>
                    {/* Tags */}
                    {commentModalPost.tags && commentModalPost.tags.length > 0 ? (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                        {commentModalPost.tags.map((tag) => (
                          <View key={tag} style={{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: palette.colors.primary + "22", borderWidth: 1, borderColor: palette.colors.primary + "44" }}>
                            <Text style={{ color: palette.colors.primary, fontSize: 12, fontWeight: "600" }}>#{tag}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>

                  {/* Comments header */}
                  <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: palette.colors.border, marginTop: 4 }}>
                    <MessageCircleIcon size={16} color={palette.colors.textMuted} />
                    <Text style={{ color: palette.colors.text, fontWeight: "800", fontSize: 15, marginLeft: 7 }}>
                      {expandedComments.length > 0 ? `${expandedComments.length} Comments` : "Comments"}
                    </Text>
                  </View>

                  {/* Comments list */}
                  <View style={{ paddingHorizontal: 16, paddingBottom: 30 }}>
                    {expandedComments.length === 0 ? (
                      <Text style={{ color: palette.colors.textMuted, textAlign: "center", marginTop: 24, marginBottom: 24, fontSize: 14 }}>
                        No comments yet. Be the first!
                      </Text>
                    ) : (
                      expandedComments.map((comment, idx) => (
                        <View
                          key={comment.id}
                          style={{
                            flexDirection: "row", gap: 12, paddingVertical: 14,
                            borderBottomWidth: idx < expandedComments.length - 1 ? 1 : 0,
                            borderBottomColor: palette.colors.border,
                          }}
                        >
                          <Pressable onPress={() => {
                            if (!comment.authorId.startsWith("demo_") && comment.authorId !== "seed_fbla_atlas") {
                              closeCommentModal();
                              navigation.navigate("StudentProfile", { userId: comment.authorId });
                            }
                          }}>
                            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: comment.authorAvatarColor, alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>{comment.authorName.charAt(0)}</Text>
                            </View>
                          </Pressable>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <Text style={{ color: palette.colors.text, fontWeight: "700", fontSize: 14 }}>{comment.authorName}</Text>
                              <Text style={{ color: palette.colors.textMuted, fontSize: 12 }}>{formatRelativeDateTime(comment.createdAt)}</Text>
                            </View>
                            <Text style={{ color: palette.colors.text, fontSize: 15, lineHeight: 22 }}>{comment.content}</Text>
                            <Pressable
                              onPress={() => {
                                setReplyingTo({ id: comment.id, name: comment.authorName });
                                commentInputVisible.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
                              }}
                              style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}
                            >
                              <CornerDownRight size={13} color={palette.colors.primary} />
                              <Text style={{ color: palette.colors.primary, fontSize: 13, fontWeight: "600" }}>Reply</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </>
              ) : null}
            </ScrollView>

            {/* Animated comment input + replying chip */}
            <Animated.View style={animatedCommentInputStyle}>
              {replyingTo ? (
                <View style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  paddingHorizontal: 16, paddingVertical: 8,
                  backgroundColor: palette.colors.primary + "18",
                  borderTopWidth: 1, borderTopColor: palette.colors.primary + "44",
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <CornerDownRight size={13} color={palette.colors.primary} />
                    <Text style={{ color: palette.colors.primary, fontSize: 13, fontWeight: "600" }}>Replying to @{replyingTo.name}</Text>
                  </View>
                  <Pressable onPress={() => setReplyingTo(null)} style={{ padding: 4 }}>
                    <X size={14} color={palette.colors.primary} />
                  </Pressable>
                </View>
              ) : null}

              <View style={{
                flexDirection: "row", gap: 10, alignItems: "center",
                paddingHorizontal: 16, paddingVertical: 10,
                paddingBottom: Math.max(10, insets.bottom),
                borderTopWidth: 1, borderTopColor: palette.colors.border,
                backgroundColor: palette.colors.surface,
              }}>
                <GlassInput
                  value={commentInput}
                  onChangeText={setCommentInput}
                  placeholder="Add a comment..."
                  containerStyle={{ flex: 1 }}
                />
                <Pressable
                  onPress={() => void handleAddComment()}
                  disabled={submittingComment || !commentInput.trim()}
                  style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: commentInput.trim() ? palette.colors.primary : palette.colors.inputSurface,
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Send size={18} color={commentInput.trim() ? "#fff" : palette.colors.textMuted} />
                </Pressable>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
    </View>
  );
}
