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
  | "daily_login"
  | "messaging_new"
  | "following_user";

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

export type UserProfile = {
  uid: string;
  displayName: string;
  schoolId: string;
  schoolName: string;
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
  moodEmoji: string | null;
  moodUpdatedAt: string | null;
  badges: string[];
  followerIds: string[];
  followingIds: string[];
  pointsByAction: Partial<Record<PointAction, number>>;
  lastDailyLoginDate: string | null;
  joinedEventIds?: string[];
  officerPosition?: OfficerPosition;
  chapterRoles?: ChapterRole[];
  yearsServed?: string;
  schoolCity?: string;
  competitiveEvents?: string[];
  placements?: UserPlacement[];
  roleExperiences?: string[];
  role?: "admin" | "member";
  banned?: boolean;
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

