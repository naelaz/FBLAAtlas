export type TierName =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond"
  | "Legend";

export type TierDefinition = {
  name: TierName;
  minXp: number;
  maxXp: number | null;
  color: string;
};

export type PointAction =
  | "posting"
  | "commenting"
  | "attending_event"
  | "likes_received"
  | "liking_post"
  | "daily_login"
  | "messaging_new"
  | "following_user"
  | "complete_practice_test"
  | "score_90_bonus"
  | "complete_flashcard_deck"
  | "complete_presentation"
  | "complete_mock_judge"
  | "duel_win"
  | "duel_loss"
  | "duel_correct_answer"
  | "seven_day_streak_bonus"
  | "perfect_test_score"
  | "first_post_bonus"
  | "profile_completed_bonus";

export type OfficerPosition =
  | "President"
  | "Vice President"
  | "Secretary"
  | "Treasurer"
  | "Reporter"
  | "Parliamentarian"
  | "Historian"
  | "Member";

export type ChapterRole =
  | "Chapter Officer"
  | "Regional Officer"
  | "State Officer"
  | "National Officer"
  | "Alumni";

export type PlacementLevel = "DLC" | "SLC" | "NLC";

export type PlacementResult =
  | "1st"
  | "2nd"
  | "3rd"
  | "Top 10"
  | "Top 20"
  | "Qualified"
  | "Participant";

export type UserPlacement = {
  id: string;
  eventName: string;
  place: PlacementResult;
  competitionLevel: PlacementLevel;
  year: number;
};

export type UserRole = "member" | "officer" | "admin" | "superadmin";
export type UserProfileType = "student" | "alumni";

export type UserMilestone = {
  id: string;
  type: string;
  date: string;
  description: string;
};

export type UserProfile = {
  uid: string;
  displayName: string;
  schoolId: string;
  schoolName: string;
  chapterId?: string;
  state?: string;
  chapterName?: string;
  membershipId?: string | null;
  onboardingCompleted?: boolean;
  authProvider?: "email" | "google" | "fbla_connect" | "guest";
  isGuest?: boolean;
  grade: string;
  avatarColor: string;
  avatarUrl: string;
  bio: string;
  xp: number;
  tier: TierName;
  graduationYear: number;
  streakCount: number;
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  moodEmoji: string | null;
  moodUpdatedAt: string | null;
  profileVisibility: "school" | "public" | "private";
  showOnlineStatus: boolean;
  showMood: boolean;
  allowFriendSuggestions: boolean;
  badges: string[];
  followerIds: string[];
  followingIds: string[];
  pointsByAction: Partial<Record<PointAction, number>>;
  xpMilestones?: string[];
  milestones?: UserMilestone[];
  lastDailyLoginDate: string | null;
  joinedEventIds?: string[];
  officerPosition?: OfficerPosition;
  chapterRoles?: ChapterRole[];
  yearsServed?: string;
  schoolCity?: string;
  competitiveEvents?: string[];
  placements?: UserPlacement[];
  roleExperiences?: string[];
  role?: UserRole;
  profileType?: UserProfileType;
  banned?: boolean;
  isSeeded?: boolean;
  primaryEvent?: string;
  createdAt: string;
  updatedAt: string;
};

export type PostItem = {
  id: string;
  schoolId: string;
  authorId: string;
  authorName: string;
  authorAvatarColor: string;
  imageUrl?: string;
  tags?: string[];
  content: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedBy: string[];
  reactionCounts: Record<string, number>;
  userReactions: Record<string, string>;
};

export type CommentItem = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorTier?: TierName;
  authorAvatarColor: string;
  content: string;
  createdAt: string;
};

export type StoryItem = {
  id: string;
  userId: string;
  userName: string;
  avatarColor: string;
  schoolId: string;
  content: string;
  createdAt: string;
  expiresAt: string;
};

export type ActivityType = "post" | "like" | "comment" | "event_join";

export type ActivityItem = {
  id: string;
  schoolId: string;
  type: ActivityType;
  actorId: string;
  actorName: string;
  actorAvatarColor: string;
  targetId: string;
  message: string;
  createdAt: string;
};

export type EventItem = {
  id: string;
  schoolId: string;
  title: string;
  description: string;
  location: string;
  category?: "Sports" | "Academic" | "Social" | "FBLA" | "Arts";
  coverImageUrl?: string;
  startAt: string;
  attendeeIds: string[];
  attendeeCount: number;
  capacity?: number;
};

export type SocialFeedPlatform = "x" | "instagram" | "facebook" | "youtube" | "tiktok";

export type SocialFeedItem = {
  platform: SocialFeedPlatform;
  handle: string;
  postText: string;
  postDate: string;
  postUrl: string;
};

export type FblaFact = {
  id: string;
  text: string;
};

export type AppNotificationType =
  | "like"
  | "comment"
  | "follow"
  | "event_reminder"
  | "message"
  | "tier_upgrade"
  | "reaction"
  | "xp"
  | "streak";

export type AppNotification = {
  id: string;
  type: AppNotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, string>;
};

export type ConversationItem = {
  id: string;
  schoolId: string;
  participants: string[];
  participantNames?: Record<string, string>;
  participantAvatars?: Record<string, string>;
  lastMessage: string;
  lastMessageSenderId?: string;
  unreadCounts?: Record<string, number>;
  typingBy?: Record<string, boolean>;
  lastSeenBy?: Record<string, string>;
  updatedAt: string;
};

export type MessageItem = {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
};

export type ClubItem = {
  id: string;
  schoolId: string;
  name: string;
  description: string;
  memberIds: string[];
  coverImageUrl: string;
  postPreview: string;
};

export type StudyGroupItem = {
  id: string;
  schoolId: string;
  className: string;
  title: string;
  memberIds: string[];
  lastMessage: string;
  updatedAt: string;
};

export type SchoolNewsItem = {
  id: string;
  schoolId: string;
  title: string;
  body: string;
  pinned: boolean;
  bannerUrl: string;
  createdAt: string;
};

export type PointAwardResult = {
  pointsAwarded: number;
  action: PointAction;
  previousXp: number;
  newXp: number;
  previousTier: TierDefinition;
  newTier: TierDefinition;
  tierUpgraded: boolean;
  streakCount?: number;
  context?: Record<string, string>;
};

