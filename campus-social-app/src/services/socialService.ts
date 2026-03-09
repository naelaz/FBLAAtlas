
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Unsubscribe,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "../config/firebase";
import {
  getBusinessImage,
  getClubImageByCategory,
  getEventImageByCategory,
  getNewsBannerImage,
  getSocialImage,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
  resolveAvatarUrl,
} from "../constants/media";
import { getTierForXp } from "../constants/gamification";
import { AVATAR_FALLBACK_COLORS } from "../constants/themes";
import { awardPointsToUser } from "./gamificationService";
import { createUserNotification } from "./notificationService";
import { formatDateTime, startOfCurrentWeekIso, toIso } from "./firestoreUtils";
import {
  ActivityItem,
  ClubItem,
  CommentItem,
  ConversationItem,
  EventItem,
  PointAwardResult,
  PostItem,
  SchoolNewsItem,
  StoryItem,
  StudyGroupItem,
  UserProfile,
} from "../types/social";
import { FeedItem } from "../types/feed";

const DEMO_SCHOOL_GRADES = ["9", "10", "11", "12"];

function parsePost(id: string, data: Record<string, unknown>): PostItem {
  return {
    id,
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    authorId: typeof data.authorId === "string" ? data.authorId : "",
    authorName: typeof data.authorName === "string" ? data.authorName : "Student",
    authorAvatarColor:
      typeof data.authorAvatarColor === "string"
        ? data.authorAvatarColor
        : AVATAR_FALLBACK_COLORS[0],
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
    tags: Array.isArray(data.tags)
      ? data.tags.filter((item): item is string => typeof item === "string")
      : [],
    content: typeof data.content === "string" ? data.content : "",
    createdAt: toIso(data.createdAt),
    likeCount: typeof data.likeCount === "number" ? data.likeCount : 0,
    commentCount: typeof data.commentCount === "number" ? data.commentCount : 0,
    likedBy: Array.isArray(data.likedBy)
      ? data.likedBy.filter((item): item is string => typeof item === "string")
      : [],
    reactionCounts:
      typeof data.reactionCounts === "object" && data.reactionCounts !== null
        ? (data.reactionCounts as Record<string, number>)
        : {},
    userReactions:
      typeof data.userReactions === "object" && data.userReactions !== null
        ? (data.userReactions as Record<string, string>)
        : {},
  };
}

function parseStory(id: string, data: Record<string, unknown>): StoryItem {
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : "",
    userName: typeof data.userName === "string" ? data.userName : "Student",
    avatarColor: typeof data.avatarColor === "string" ? data.avatarColor : AVATAR_FALLBACK_COLORS[0],
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    content: typeof data.content === "string" ? data.content : "",
    createdAt: toIso(data.createdAt),
    expiresAt: toIso(data.expiresAt),
  };
}

function parseActivity(id: string, data: Record<string, unknown>): ActivityItem {
  return {
    id,
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    type:
      data.type === "post" ||
      data.type === "like" ||
      data.type === "comment" ||
      data.type === "event_join"
        ? data.type
        : "post",
    actorId: typeof data.actorId === "string" ? data.actorId : "",
    actorName: typeof data.actorName === "string" ? data.actorName : "Student",
    actorAvatarColor:
      typeof data.actorAvatarColor === "string" ? data.actorAvatarColor : AVATAR_FALLBACK_COLORS[0],
    targetId: typeof data.targetId === "string" ? data.targetId : "",
    message: typeof data.message === "string" ? data.message : "",
    createdAt: toIso(data.createdAt),
  };
}

function parseEvent(id: string, data: Record<string, unknown>): EventItem {
  return {
    id,
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    title: typeof data.title === "string" ? data.title : "FBLA Event",
    description: typeof data.description === "string" ? data.description : "",
    location: typeof data.location === "string" ? data.location : "FBLA Chapter",
    category:
      data.category === "Sports" ||
      data.category === "Academic" ||
      data.category === "Social" ||
      data.category === "FBLA" ||
      data.category === "Arts"
        ? data.category
        : "FBLA",
    coverImageUrl:
      typeof data.coverImageUrl === "string" ? data.coverImageUrl : undefined,
    startAt: toIso(data.startAt),
    attendeeIds: Array.isArray(data.attendeeIds)
      ? data.attendeeIds.filter((item): item is string => typeof item === "string")
      : [],
    attendeeCount: typeof data.attendeeCount === "number" ? data.attendeeCount : 0,
  };
}

function parseComment(postId: string, id: string, data: Record<string, unknown>): CommentItem {
  return {
    id,
    postId,
    authorId: typeof data.authorId === "string" ? data.authorId : "",
    authorName: typeof data.authorName === "string" ? data.authorName : "Student",
    authorTier:
      data.authorTier === "Bronze" ||
      data.authorTier === "Silver" ||
      data.authorTier === "Gold" ||
      data.authorTier === "Platinum" ||
      data.authorTier === "Diamond" ||
      data.authorTier === "Legend"
        ? data.authorTier
        : undefined,
    authorAvatarColor:
      typeof data.authorAvatarColor === "string"
        ? data.authorAvatarColor
        : AVATAR_FALLBACK_COLORS[0],
    content: typeof data.content === "string" ? data.content : "",
    createdAt: toIso(data.createdAt),
  };
}

function parseConversation(id: string, data: Record<string, unknown>): ConversationItem {
  return {
    id,
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    participants: Array.isArray(data.participants)
      ? data.participants.filter((item): item is string => typeof item === "string")
      : [],
    lastMessage: typeof data.lastMessage === "string" ? data.lastMessage : "",
    updatedAt: toIso(data.updatedAt),
  };
}

async function createActivity(
  schoolId: string,
  type: ActivityItem["type"],
  actor: Pick<UserProfile, "uid" | "displayName" | "avatarColor">,
  targetId: string,
  message: string,
): Promise<void> {
  await addDoc(collection(db, "activities"), {
    schoolId,
    type,
    actorId: actor.uid,
    actorName: actor.displayName,
    actorAvatarColor: actor.avatarColor,
    targetId,
    message,
    createdAt: serverTimestamp(),
  });
}
export async function seedSchoolDataForUser(user: UserProfile): Promise<void> {
  const seedRef = doc(db, "app_meta", `seed_${user.schoolId}_v1`);
  const existing = await getDoc(seedRef);
  if (existing.exists()) {
    return;
  }

  const demoUsers: UserProfile[] = [
    {
      ...user,
      displayName: "Avery Chen",
      uid: "demo_avery",
      grade: "11",
      xp: 1480,
      tier: "Silver" as UserProfile["tier"],
      followerIds: [],
      followingIds: [],
      bio: "Robotics captain and coding mentor.",
      pointsByAction: {},
      lastLoginDate: null,
      lastDailyLoginDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      ...user,
      displayName: "Maya Patel",
      uid: "demo_maya",
      grade: "11",
      xp: 4200,
      tier: "Platinum" as UserProfile["tier"],
      followerIds: [],
      followingIds: [],
      bio: "DECA, FBLA, and tennis.",
      pointsByAction: {},
      lastLoginDate: null,
      lastDailyLoginDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      ...user,
      displayName: "Noah Brooks",
      uid: "demo_noah",
      grade: "10",
      xp: 780,
      tier: "Silver" as UserProfile["tier"],
      followerIds: [],
      followingIds: [],
      bio: "FBLA chapter photographer.",
      pointsByAction: {},
      lastLoginDate: null,
      lastDailyLoginDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      ...user,
      displayName: "Luna Garcia",
      uid: "demo_luna",
      grade: "12",
      xp: 8600,
      tier: "Diamond" as UserProfile["tier"],
      followerIds: [],
      followingIds: [],
      bio: "Student body VP and hackathon organizer.",
      pointsByAction: {},
      lastLoginDate: null,
      lastDailyLoginDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      ...user,
      displayName: "Jordan Kim",
      uid: "demo_jordan",
      grade: "9",
      xp: 240,
      tier: "Bronze" as UserProfile["tier"],
      followerIds: [],
      followingIds: [],
      bio: "First-year coding club member.",
      pointsByAction: {},
      lastLoginDate: null,
      lastDailyLoginDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ].map((item, index): UserProfile => ({
    ...item,
    avatarColor:
      AVATAR_FALLBACK_COLORS[index % AVATAR_FALLBACK_COLORS.length],
    avatarUrl: getUserAvatarUrl(item.displayName),
    schoolName: user.schoolName,
    schoolId: user.schoolId,
    grade: DEMO_SCHOOL_GRADES[index % DEMO_SCHOOL_GRADES.length],
    graduationYear: new Date().getFullYear() + (4 - index),
    streakCount: Math.max(1, index + 2),
    currentStreak: Math.max(1, index + 2),
    longestStreak: Math.max(1, index + 2),
    badges: ["First Login", "Social Starter"],
  }));

  const now = Date.now();
  const batch = writeBatch(db);

  for (const demoUser of demoUsers) {
    batch.set(
      doc(db, "users", demoUser.uid),
      {
        ...demoUser,
        createdAt: Timestamp.fromDate(new Date(now - 1000 * 60 * 60 * 48)),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  const postSeeds = [
    {
      id: "seed_post_1",
      author: demoUsers[0],
      content: "Anyone prepping for next week's business pitch challenge?",
      imageUrl: getBusinessImage("seed_post_1"),
      likeCount: 12,
      commentCount: 2,
    },
    {
      id: "seed_post_2",
      author: demoUsers[1],
      content: "Study hall in room 210 at 3:45 PM. Bring your math packet.",
      imageUrl: getSocialImage("seed_post_2"),
      likeCount: 22,
      commentCount: 5,
    },
    {
      id: "seed_post_3",
      author: demoUsers[3],
      content: "Signed us up for the spring volunteer drive. Need 10 helpers.",
      imageUrl: getEventImageByCategory("Social", "seed_post_3"),
      likeCount: 31,
      commentCount: 8,
    },
  ];

  postSeeds.forEach((seed, index) => {
    const likedBy = demoUsers
      .slice(0, Math.min(seed.likeCount, demoUsers.length))
      .map((u) => u.uid);

    batch.set(
      doc(db, "posts", seed.id),
      {
        schoolId: user.schoolId,
        authorId: seed.author.uid,
        authorName: seed.author.displayName,
        authorAvatarColor: seed.author.avatarColor,
        imageUrl: seed.imageUrl,
        content: seed.content,
        likeCount: seed.likeCount,
        commentCount: seed.commentCount,
        likedBy,
        reactionCounts: { "🔥": index + 2, "👏": index + 1 },
        userReactions: {
          [seed.author.uid]: "🔥",
        },
        createdAt: Timestamp.fromDate(new Date(now - (index + 1) * 1000 * 60 * 90)),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  const eventSeeds = [
    {
      id: "seed_event_1",
      title: "FBLA Startup Night",
      description: "Pitch your startup concept in 3 minutes.",
      location: "Auditorium",
      category: "FBLA" as const,
      coverImageUrl: getEventImageByCategory("FBLA", "seed_event_1"),
      startAt: Timestamp.fromDate(new Date(now + 1000 * 60 * 60 * 24 * 2)),
      attendeeIds: [demoUsers[0].uid, demoUsers[1].uid],
    },
    {
      id: "seed_event_2",
      title: "Coding Interview Workshop",
      description: "Mock interviews and resume review.",
      location: "Room 204",
      category: "Academic" as const,
      coverImageUrl: getEventImageByCategory("Academic", "seed_event_2"),
      startAt: Timestamp.fromDate(new Date(now + 1000 * 60 * 60 * 24 * 4)),
      attendeeIds: [demoUsers[3].uid, demoUsers[4].uid],
    },
  ];

  eventSeeds.forEach((event) => {
    batch.set(
      doc(db, "events", event.id),
      {
        schoolId: user.schoolId,
        title: event.title,
        description: event.description,
        location: event.location,
        category: event.category,
        coverImageUrl: event.coverImageUrl,
        startAt: event.startAt,
        attendeeIds: event.attendeeIds,
        attendeeCount: event.attendeeIds.length,
      },
      { merge: true },
    );
  });

  const storySeeds = [
    { id: "seed_story_1", user: demoUsers[0], content: "Mock trial finals today!" },
    { id: "seed_story_2", user: demoUsers[1], content: "Lunch meetup at quad 🍕" },
    { id: "seed_story_3", user: demoUsers[2], content: "New photo dump from game night" },
  ];

  storySeeds.forEach((story, index) => {
    batch.set(
      doc(db, "stories", story.id),
      {
        schoolId: user.schoolId,
        userId: story.user.uid,
        userName: story.user.displayName,
        avatarColor: story.user.avatarColor,
        content: story.content,
        createdAt: Timestamp.fromDate(new Date(now - index * 1000 * 60 * 60)),
        expiresAt: Timestamp.fromDate(new Date(now + 1000 * 60 * 60 * 20)),
      },
      { merge: true },
    );
  });

  batch.set(
    doc(db, "activities", "seed_activity_1"),
    {
      schoolId: user.schoolId,
      type: "event_join",
      actorId: demoUsers[1].uid,
      actorName: demoUsers[1].displayName,
      actorAvatarColor: demoUsers[1].avatarColor,
      targetId: "seed_event_1",
      message: `${demoUsers[1].displayName} joined FBLA Startup Night`,
      createdAt: Timestamp.fromDate(new Date(now - 1000 * 60 * 40)),
    },
    { merge: true },
  );

  batch.set(
    doc(db, "homeFeed", "seed_announcement_1"),
    {
      title: "Welcome to FBLA Atlas",
      body: "Use posts, stories, events, and messages to stay connected in your chapter.",
      author: "FBLA Atlas Team",
      createdAt: Timestamp.fromDate(new Date(now - 1000 * 60 * 60 * 12)),
    },
    { merge: true },
  );

  const clubSeeds = [
    {
      id: "seed_club_1",
      name: "FBLA Competitive Team",
      description: "Practice events, case studies, and presentation coaching.",
      memberIds: [demoUsers[0].uid, demoUsers[1].uid, demoUsers[3].uid],
      coverImageUrl: getClubImageByCategory("FBLA Competitive Team", "business presentation"),
      postPreview: "Regionals prep session Thursday at 4 PM.",
    },
    {
      id: "seed_club_2",
      name: "Coding Club",
      description: "Build apps, web projects, and hackathon prep.",
      memberIds: [demoUsers[2].uid, demoUsers[3].uid, demoUsers[4].uid],
      coverImageUrl: getClubImageByCategory("Coding Club", "academic study"),
      postPreview: "Mobile sprint starts this weekend.",
    },
  ];

  clubSeeds.forEach((club) => {
    batch.set(
      doc(db, "clubs", club.id),
      {
        schoolId: user.schoolId,
        ...club,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  const groupSeeds = [
    {
      id: "seed_group_1",
      className: "AP Economics",
      title: "Unit 5 Review Circle",
      memberIds: [demoUsers[0].uid, demoUsers[1].uid],
      lastMessage: "Let's review supply and demand graphs tonight.",
    },
    {
      id: "seed_group_2",
      className: "Algebra II",
      title: "Quiz Rescue Squad",
      memberIds: [demoUsers[2].uid, demoUsers[4].uid],
      lastMessage: "Anyone want to solve practice problems at lunch?",
    },
  ];

  groupSeeds.forEach((group, index) => {
    batch.set(
      doc(db, "studyGroups", group.id),
      {
        schoolId: user.schoolId,
        ...group,
        updatedAt: Timestamp.fromDate(new Date(now - index * 1000 * 60 * 45)),
      },
      { merge: true },
    );
  });

  const newsSeeds = [
    {
      id: "seed_news_1",
      title: "Principal Update: Spring Showcase Dates",
      body: "Student showcase signups open this Friday in the activities office.",
      pinned: true,
      bannerUrl: getNewsBannerImage("seed_news_1"),
    },
    {
      id: "seed_news_2",
      title: "Library Extends Study Hours",
      body: "Library will stay open until 6:30 PM during finals week.",
      pinned: false,
      bannerUrl: getNewsBannerImage("seed_news_2"),
    },
  ];

  newsSeeds.forEach((news, index) => {
    batch.set(
      doc(db, "schoolNews", news.id),
      {
        schoolId: user.schoolId,
        ...news,
        createdAt: Timestamp.fromDate(new Date(now - index * 1000 * 60 * 60 * 5)),
      },
      { merge: true },
    );
  });

  batch.set(seedRef, { seededAt: serverTimestamp(), schoolId: user.schoolId }, { merge: true });
  await batch.commit();
}
export function subscribePosts(
  schoolId: string,
  onChange: (items: PostItem[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(80));
  return onSnapshot(
    q,
    (snap) => {
      const posts = snap.docs
        .map((docSnap) => parsePost(docSnap.id, docSnap.data() as Record<string, unknown>))
        .filter((item) => item.schoolId === schoolId);
      onChange(posts);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Posts subscription failed:", error);
      }
    },
  );
}

export async function fetchPostsOnce(schoolId: string): Promise<PostItem[]> {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(80));
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => parsePost(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((item) => item.schoolId === schoolId);
}

export function subscribeStories(
  schoolId: string,
  onChange: (items: StoryItem[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(collection(db, "stories"), orderBy("createdAt", "desc"), limit(40));
  return onSnapshot(
    q,
    (snap) => {
      const now = Date.now();
      const items = snap.docs
        .map((docSnap) => parseStory(docSnap.id, docSnap.data() as Record<string, unknown>))
        .filter((story) => story.schoolId === schoolId)
        .filter((story) => new Date(story.expiresAt).getTime() > now);
      onChange(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Stories subscription failed:", error);
      }
    },
  );
}

export async function fetchStoriesOnce(schoolId: string): Promise<StoryItem[]> {
  const q = query(collection(db, "stories"), orderBy("createdAt", "desc"), limit(40));
  const now = Date.now();
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => parseStory(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((story) => story.schoolId === schoolId)
    .filter((story) => new Date(story.expiresAt).getTime() > now);
}

export function subscribeActivities(
  schoolId: string,
  onChange: (items: ActivityItem[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(collection(db, "activities"), orderBy("createdAt", "desc"), limit(80));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((docSnap) =>
          parseActivity(docSnap.id, docSnap.data() as Record<string, unknown>),
        )
        .filter((activity) => activity.schoolId === schoolId);
      onChange(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Activities subscription failed:", error);
      }
    },
  );
}

export async function fetchActivitiesOnce(schoolId: string): Promise<ActivityItem[]> {
  const q = query(collection(db, "activities"), orderBy("createdAt", "desc"), limit(80));
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => parseActivity(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((activity) => activity.schoolId === schoolId);
}

export function subscribeEvents(
  schoolId: string,
  onChange: (items: EventItem[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(collection(db, "events"), orderBy("startAt", "asc"), limit(60));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((docSnap) => parseEvent(docSnap.id, docSnap.data() as Record<string, unknown>))
        .filter((item) => item.schoolId === schoolId);
      onChange(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Events subscription failed:", error);
      }
    },
  );
}

export async function fetchEventsOnce(schoolId: string): Promise<EventItem[]> {
  const q = query(collection(db, "events"), orderBy("startAt", "asc"), limit(60));
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => parseEvent(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((item) => item.schoolId === schoolId);
}
export async function createPost(
  actor: UserProfile,
  content: string,
  imageUrl?: string,
  tags: string[] = [],
): Promise<PointAwardResult | null> {
  const trimmed = content.trim();
  if (!trimmed && !imageUrl) {
    return null;
  }

  const ref = await addDoc(collection(db, "posts"), {
    schoolId: actor.schoolId,
    authorId: actor.uid,
    authorName: actor.displayName,
    authorAvatarColor: actor.avatarColor,
    imageUrl: imageUrl || null,
    tags,
    content: trimmed,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    likeCount: 0,
    commentCount: 0,
    likedBy: [],
    reactionCounts: {},
    userReactions: {},
  });

  await createActivity(actor.schoolId, "post", actor, ref.id, `${actor.displayName} posted an update`);
  return awardPointsToUser(actor.uid, "posting");
}

export async function toggleLikeOnPost(post: PostItem, actor: UserProfile): Promise<boolean> {
  const postRef = doc(db, "posts", post.id);
  const liked = await runTransaction(db, async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists()) {
      return false;
    }

    const data = snap.data() as Record<string, unknown>;
    const likedBy = Array.isArray(data.likedBy)
      ? data.likedBy.filter((item): item is string => typeof item === "string")
      : [];

    const hasLiked = likedBy.includes(actor.uid);
    const nextLikedBy = hasLiked
      ? likedBy.filter((id) => id !== actor.uid)
      : [...likedBy, actor.uid];

    tx.set(
      postRef,
      {
        likedBy: nextLikedBy,
        likeCount: nextLikedBy.length,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return !hasLiked;
  });

  if (liked) {
    await createActivity(
      actor.schoolId,
      "like",
      actor,
      post.id,
      `${actor.displayName} liked a post`,
    );

    await awardPointsToUser(actor.uid, "liking_post");

    if (post.authorId !== actor.uid) {
      await awardPointsToUser(post.authorId, "likes_received");
      await createUserNotification(post.authorId, {
        type: "like",
        title: "New Like",
        body: `${actor.displayName} liked your post`,
        metadata: { postId: post.id },
      });
    }
  }

  return liked;
}

export async function setPostReaction(
  post: PostItem,
  actor: UserProfile,
  emoji: string,
): Promise<void> {
  const postRef = doc(db, "posts", post.id);
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists()) {
      return { changed: false };
    }

    const data = snap.data() as Record<string, unknown>;
    const reactionCounts =
      typeof data.reactionCounts === "object" && data.reactionCounts !== null
        ? { ...(data.reactionCounts as Record<string, number>) }
        : {};
    const userReactions =
      typeof data.userReactions === "object" && data.userReactions !== null
        ? { ...(data.userReactions as Record<string, string>) }
        : {};

    const previousEmoji = userReactions[actor.uid];
    if (previousEmoji === emoji) {
      delete userReactions[actor.uid];
      const currentCount = reactionCounts[emoji] || 0;
      reactionCounts[emoji] = Math.max(0, currentCount - 1);
      if (reactionCounts[emoji] === 0) {
        delete reactionCounts[emoji];
      }
      tx.set(
        postRef,
        { reactionCounts, userReactions, updatedAt: serverTimestamp() },
        { merge: true },
      );
      return { changed: true };
    }

    if (previousEmoji) {
      const previousCount = reactionCounts[previousEmoji] || 0;
      reactionCounts[previousEmoji] = Math.max(0, previousCount - 1);
      if (reactionCounts[previousEmoji] === 0) {
        delete reactionCounts[previousEmoji];
      }
    }

    userReactions[actor.uid] = emoji;
    reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;

    tx.set(
      postRef,
      { reactionCounts, userReactions, updatedAt: serverTimestamp() },
      { merge: true },
    );
    return { changed: true };
  });

  if (result.changed && post.authorId !== actor.uid) {
    await createUserNotification(post.authorId, {
      type: "reaction",
      title: "New Reaction",
      body: `${actor.displayName} reacted ${emoji} to your post`,
      metadata: { postId: post.id },
    });
  }
}

export function subscribePostComments(
  postId: string,
  onChange: (items: CommentItem[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(db, "posts", postId, "comments"),
    orderBy("createdAt", "desc"),
    limit(20),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((docSnap) =>
          parseComment(postId, docSnap.id, docSnap.data() as Record<string, unknown>),
        ),
      );
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Comments subscription failed:", error);
      }
    },
  );
}

export async function addCommentToPost(
  post: PostItem,
  actor: UserProfile,
  content: string,
): Promise<PointAwardResult | null> {
  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }

  const postRef = doc(db, "posts", post.id);
  await addDoc(collection(db, "posts", post.id, "comments"), {
    postId: post.id,
    authorId: actor.uid,
    authorName: actor.displayName,
    authorTier: actor.tier,
    authorAvatarColor: actor.avatarColor,
    content: trimmed,
    createdAt: serverTimestamp(),
  });

  await updateDoc(postRef, {
    commentCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  await createActivity(
    actor.schoolId,
    "comment",
    actor,
    post.id,
    `${actor.displayName} commented on a post`,
  );

  if (post.authorId !== actor.uid) {
    await createUserNotification(post.authorId, {
      type: "comment",
      title: "New Comment",
      body: `${actor.displayName}: ${trimmed.slice(0, 60)}`,
      metadata: { postId: post.id },
    });
  }

  return awardPointsToUser(actor.uid, "commenting");
}
export async function toggleFollowUser(
  currentUser: UserProfile,
  targetUser: UserProfile,
): Promise<{ following: boolean; award: PointAwardResult | null }> {
  if (currentUser.uid === targetUser.uid) {
    return { following: false, award: null };
  }

  const currentRef = doc(db, "users", currentUser.uid);
  const targetRef = doc(db, "users", targetUser.uid);

  const following = await runTransaction(db, async (tx) => {
    const [currentSnap, targetSnap] = await Promise.all([
      tx.get(currentRef),
      tx.get(targetRef),
    ]);

    const currentFollowing = currentSnap.exists() && Array.isArray(currentSnap.data().followingIds)
      ? (currentSnap.data().followingIds as string[])
      : [];
    const targetFollowers = targetSnap.exists() && Array.isArray(targetSnap.data().followerIds)
      ? (targetSnap.data().followerIds as string[])
      : [];

    const isFollowing = currentFollowing.includes(targetUser.uid);

    const nextFollowing = isFollowing
      ? currentFollowing.filter((id) => id !== targetUser.uid)
      : [...currentFollowing, targetUser.uid];

    const nextFollowers = isFollowing
      ? targetFollowers.filter((id) => id !== currentUser.uid)
      : [...targetFollowers, currentUser.uid];

    tx.set(currentRef, { followingIds: nextFollowing, updatedAt: serverTimestamp() }, { merge: true });
    tx.set(targetRef, { followerIds: nextFollowers, updatedAt: serverTimestamp() }, { merge: true });

    return !isFollowing;
  });

  let award: PointAwardResult | null = null;

  if (following) {
    await createUserNotification(targetUser.uid, {
      type: "follow",
      title: "New Follower",
      body: `${currentUser.displayName} started following you`,
      metadata: { userId: currentUser.uid },
    });

    award = await awardPointsToUser(currentUser.uid, "following_user");
  }

  return { following, award };
}

export async function toggleEventAttendance(
  event: EventItem,
  actor: UserProfile,
  options?: { notifyEventReminder?: boolean },
): Promise<{ joined: boolean; award: PointAwardResult | null }> {
  const eventRef = doc(db, "events", event.id);
  const userRef = doc(db, "users", actor.uid);

  const joined = await runTransaction(db, async (tx) => {
    const [eventSnap, userSnap] = await Promise.all([tx.get(eventRef), tx.get(userRef)]);
    if (!eventSnap.exists()) {
      return false;
    }

    const data = eventSnap.data() as Record<string, unknown>;
    const attendeeIds = Array.isArray(data.attendeeIds)
      ? data.attendeeIds.filter((item): item is string => typeof item === "string")
      : [];

    const alreadyJoined = attendeeIds.includes(actor.uid);
    const nextAttendees = alreadyJoined
      ? attendeeIds.filter((id) => id !== actor.uid)
      : [...attendeeIds, actor.uid];

    tx.set(
      eventRef,
      {
        attendeeIds: nextAttendees,
        attendeeCount: nextAttendees.length,
      },
      { merge: true },
    );

    const userData = userSnap.exists()
      ? (userSnap.data() as Record<string, unknown>)
      : {};
    const joinedEventIds = Array.isArray(userData.joinedEventIds)
      ? userData.joinedEventIds.filter((item): item is string => typeof item === "string")
      : [];
    const nextJoined = alreadyJoined
      ? joinedEventIds.filter((id) => id !== event.id)
      : [...new Set([...joinedEventIds, event.id])];

    tx.set(
      userRef,
      {
        joinedEventIds: nextJoined,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return !alreadyJoined;
  });

  if (!joined) {
    return { joined: false, award: null };
  }

  const award = await awardPointsToUser(actor.uid, "attending_event", {
    eventName: event.title,
  });
  await createActivity(
    actor.schoolId,
    "event_join",
    actor,
    event.id,
    `${actor.displayName} is going to ${event.title}`,
  );

  if (options?.notifyEventReminder !== false) {
    await createUserNotification(actor.uid, {
      type: "event_reminder",
      title: "Event Reminder",
      body: `You joined ${event.title}. Starts ${formatDateTime(event.startAt)} at ${event.location}.`,
      metadata: { eventId: event.id },
    });
  }

  return { joined: true, award };
}

export function getTrendingPosts(posts: PostItem[]): PostItem[] {
  const weekStart = new Date(startOfCurrentWeekIso()).getTime();
  return [...posts]
    .filter((post) => new Date(post.createdAt).getTime() >= weekStart)
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 5);
}

export function getSuggestedFriends(
  users: UserProfile[],
  current: UserProfile,
): UserProfile[] {
  return users
    .filter((user) => user.uid !== current.uid)
    .filter((user) => user.allowFriendSuggestions !== false)
    .filter((user) => user.schoolId === current.schoolId)
    .filter((user) => user.grade === current.grade)
    .filter((user) => !current.followingIds.includes(user.uid))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 6);
}
export function subscribeSchoolUsers(
  schoolId: string,
  onChange: (users: UserProfile[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(collection(db, "users"), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      const users = snap.docs
        .map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          return {
            uid: docSnap.id,
            displayName:
              typeof data.displayName === "string" ? data.displayName : `Student ${docSnap.id.slice(0, 4)}`,
            schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
            schoolName: typeof data.schoolName === "string" ? data.schoolName : "",
            grade: typeof data.grade === "string" ? data.grade : "11",
            avatarColor:
              typeof data.avatarColor === "string" ? data.avatarColor : AVATAR_FALLBACK_COLORS[0],
            avatarUrl:
              typeof data.avatarUrl === "string"
                ? data.avatarUrl
                : getUserAvatarFallbackUrl(docSnap.id),
            bio: typeof data.bio === "string" ? data.bio : "",
            xp: typeof data.xp === "number" ? data.xp : 0,
            tier: getTierForXp(typeof data.xp === "number" ? data.xp : 0).name,
            graduationYear:
              typeof data.graduationYear === "number"
                ? data.graduationYear
                : new Date().getFullYear() + 1,
            streakCount:
              typeof data.currentStreak === "number"
                ? data.currentStreak
                : typeof data.streakCount === "number"
                  ? data.streakCount
                  : 0,
            currentStreak:
              typeof data.currentStreak === "number"
                ? data.currentStreak
                : typeof data.streakCount === "number"
                  ? data.streakCount
                  : 0,
            longestStreak:
              typeof data.longestStreak === "number"
                ? data.longestStreak
                : typeof data.currentStreak === "number"
                  ? data.currentStreak
                  : typeof data.streakCount === "number"
                    ? data.streakCount
                    : 0,
            lastLoginDate:
              typeof data.lastLoginDate === "string"
                ? data.lastLoginDate
                : typeof data.lastDailyLoginDate === "string"
                  ? data.lastDailyLoginDate
                  : null,
            moodEmoji: typeof data.moodEmoji === "string" ? data.moodEmoji : null,
            moodUpdatedAt:
              typeof data.moodUpdatedAt === "string" ? data.moodUpdatedAt : null,
            profileVisibility:
              data.profileVisibility === "public" ||
              data.profileVisibility === "private" ||
              data.profileVisibility === "school"
                ? data.profileVisibility
                : "school",
            showOnlineStatus:
              typeof data.showOnlineStatus === "boolean" ? data.showOnlineStatus : true,
            showMood: typeof data.showMood === "boolean" ? data.showMood : true,
            allowFriendSuggestions:
              typeof data.allowFriendSuggestions === "boolean"
                ? data.allowFriendSuggestions
                : true,
            badges: Array.isArray(data.badges)
              ? data.badges.filter((item): item is string => typeof item === "string")
              : [],
            followerIds: Array.isArray(data.followerIds)
              ? data.followerIds.filter((item): item is string => typeof item === "string")
              : [],
            followingIds: Array.isArray(data.followingIds)
              ? data.followingIds.filter((item): item is string => typeof item === "string")
              : [],
            pointsByAction:
              typeof data.pointsByAction === "object" && data.pointsByAction !== null
                ? (data.pointsByAction as UserProfile["pointsByAction"])
                : {},
            lastDailyLoginDate:
              typeof data.lastDailyLoginDate === "string"
                ? data.lastDailyLoginDate
                : typeof data.lastLoginDate === "string"
                  ? data.lastLoginDate
                  : null,
            joinedEventIds: Array.isArray(data.joinedEventIds)
              ? data.joinedEventIds.filter((item): item is string => typeof item === "string")
              : [],
            createdAt: toIso(data.createdAt),
            updatedAt: toIso(data.updatedAt),
          } satisfies UserProfile;
        })
        .filter((user) => user.schoolId === schoolId);

      onChange(users);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Users subscription failed:", error);
      }
    },
  );
}

export async function fetchSchoolUsersOnce(schoolId: string): Promise<UserProfile[]> {
  const snap = await getDocs(query(collection(db, "users"), limit(100)));
  return snap.docs
    .map((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      return {
        uid: docSnap.id,
        displayName:
          typeof data.displayName === "string" ? data.displayName : `Student ${docSnap.id.slice(0, 4)}`,
        schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
        schoolName: typeof data.schoolName === "string" ? data.schoolName : "",
        grade: typeof data.grade === "string" ? data.grade : "11",
        avatarColor:
          typeof data.avatarColor === "string" ? data.avatarColor : AVATAR_FALLBACK_COLORS[0],
        avatarUrl:
          typeof data.avatarUrl === "string"
            ? data.avatarUrl
            : getUserAvatarFallbackUrl(docSnap.id),
        bio: typeof data.bio === "string" ? data.bio : "",
        xp: typeof data.xp === "number" ? data.xp : 0,
        tier: getTierForXp(typeof data.xp === "number" ? data.xp : 0).name,
        graduationYear:
          typeof data.graduationYear === "number"
            ? data.graduationYear
            : new Date().getFullYear() + 1,
        streakCount:
          typeof data.currentStreak === "number"
            ? data.currentStreak
            : typeof data.streakCount === "number"
              ? data.streakCount
              : 0,
        currentStreak:
          typeof data.currentStreak === "number"
            ? data.currentStreak
            : typeof data.streakCount === "number"
              ? data.streakCount
              : 0,
        longestStreak:
          typeof data.longestStreak === "number"
            ? data.longestStreak
            : typeof data.currentStreak === "number"
              ? data.currentStreak
              : typeof data.streakCount === "number"
                ? data.streakCount
                : 0,
        lastLoginDate:
          typeof data.lastLoginDate === "string"
            ? data.lastLoginDate
            : typeof data.lastDailyLoginDate === "string"
              ? data.lastDailyLoginDate
              : null,
        moodEmoji: typeof data.moodEmoji === "string" ? data.moodEmoji : null,
        moodUpdatedAt:
          typeof data.moodUpdatedAt === "string" ? data.moodUpdatedAt : null,
        profileVisibility:
          data.profileVisibility === "public" ||
          data.profileVisibility === "private" ||
          data.profileVisibility === "school"
            ? data.profileVisibility
            : "school",
        showOnlineStatus:
          typeof data.showOnlineStatus === "boolean" ? data.showOnlineStatus : true,
        showMood: typeof data.showMood === "boolean" ? data.showMood : true,
        allowFriendSuggestions:
          typeof data.allowFriendSuggestions === "boolean"
            ? data.allowFriendSuggestions
            : true,
        badges: Array.isArray(data.badges)
          ? data.badges.filter((item): item is string => typeof item === "string")
          : [],
        followerIds: Array.isArray(data.followerIds)
          ? data.followerIds.filter((item): item is string => typeof item === "string")
          : [],
        followingIds: Array.isArray(data.followingIds)
          ? data.followingIds.filter((item): item is string => typeof item === "string")
          : [],
        pointsByAction:
          typeof data.pointsByAction === "object" && data.pointsByAction !== null
            ? (data.pointsByAction as UserProfile["pointsByAction"])
            : {},
        lastDailyLoginDate:
          typeof data.lastDailyLoginDate === "string"
            ? data.lastDailyLoginDate
            : typeof data.lastLoginDate === "string"
              ? data.lastLoginDate
              : null,
        joinedEventIds: Array.isArray(data.joinedEventIds)
          ? data.joinedEventIds.filter((item): item is string => typeof item === "string")
          : [],
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      } satisfies UserProfile;
    })
    .filter((user) => user.schoolId === schoolId);
}

export function subscribeConversationsForUser(
  uid: string,
  schoolId: string,
  onChange: (items: ConversationItem[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(collection(db, "messages"), orderBy("updatedAt", "desc"), limit(80));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((docSnap) => parseConversation(docSnap.id, docSnap.data() as Record<string, unknown>))
        .filter((conversation) => conversation.schoolId === schoolId)
        .filter((conversation) => conversation.participants.includes(uid));
      onChange(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Messages subscription failed:", error);
      }
    },
  );
}

export async function fetchConversationsOnce(
  uid: string,
  schoolId: string,
): Promise<ConversationItem[]> {
  const snap = await getDocs(
    query(collection(db, "messages"), orderBy("updatedAt", "desc"), limit(80)),
  );
  return snap.docs
    .map((docSnap) => parseConversation(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((conversation) => conversation.schoolId === schoolId)
    .filter((conversation) => conversation.participants.includes(uid));
}

export async function sendMessageToUser(
  actor: UserProfile,
  target: UserProfile,
  messageText: string,
): Promise<PointAwardResult | null> {
  const trimmed = messageText.trim();
  if (!trimmed) {
    return null;
  }

  const participants = [actor.uid, target.uid].sort();
  const conversationId = participants.join("__");
  const conversationRef = doc(db, "messages", conversationId);

  const wasNewConversation = await runTransaction(db, async (tx) => {
    const snap = await tx.get(conversationRef);
    const exists = snap.exists();
    tx.set(
      conversationRef,
      {
        schoolId: actor.schoolId,
        participants,
        lastMessage: trimmed,
        updatedAt: serverTimestamp(),
        createdAt: exists ? snap.data().createdAt : serverTimestamp(),
      },
      { merge: true },
    );
    return !exists;
  });

  await addDoc(collection(db, "messages", conversationId, "items"), {
    senderId: actor.uid,
    senderName: actor.displayName,
    body: trimmed,
    createdAt: serverTimestamp(),
  });

  await createUserNotification(target.uid, {
    type: "message",
    title: "New Message",
    body: `${actor.displayName}: ${trimmed.slice(0, 50)}`,
    metadata: { userId: actor.uid },
  });

  if (!wasNewConversation) {
    return null;
  }
  return awardPointsToUser(actor.uid, "messaging_new");
}
export async function searchFblaAtlas(
  schoolId: string,
  rawQuery: string,
): Promise<{ users: UserProfile[]; posts: PostItem[] }> {
  const queryText = rawQuery.trim().toLowerCase();
  if (!queryText) {
    return { users: [], posts: [] };
  }

  const [users, posts] = await Promise.all([
    fetchSchoolUsersOnce(schoolId),
    fetchPostsOnce(schoolId),
  ]);

  const matchedUsers = users.filter((user) => {
    return (
      user.displayName.toLowerCase().includes(queryText) ||
      user.grade.toLowerCase().includes(queryText)
    );
  });

  const matchedPosts = posts.filter((post) => {
    return (
      post.content.toLowerCase().includes(queryText) ||
      post.authorName.toLowerCase().includes(queryText)
    );
  });

  return { users: matchedUsers.slice(0, 15), posts: matchedPosts.slice(0, 20) };
}

export async function searchCampusEverything(
  schoolId: string,
  rawQuery: string,
): Promise<{
  users: UserProfile[];
  posts: PostItem[];
  events: EventItem[];
  clubs: ClubItem[];
  studyGroups: StudyGroupItem[];
  schoolNews: SchoolNewsItem[];
  announcements: FeedItem[];
}> {
  const queryText = rawQuery.trim().toLowerCase();
  if (!queryText) {
    return {
      users: [],
      posts: [],
      events: [],
      clubs: [],
      studyGroups: [],
      schoolNews: [],
      announcements: [],
    };
  }

  const [users, posts, events, clubs, studyGroups, schoolNews, announcements] =
    await Promise.all([
      fetchSchoolUsersOnce(schoolId),
      fetchPostsOnce(schoolId),
      fetchEventsOnce(schoolId),
      fetchClubsOnce(schoolId),
      fetchStudyGroupsOnce(schoolId),
      fetchSchoolNewsOnce(schoolId),
      fetchAnnouncements(),
    ]);

  return {
    users: users
      .filter((user) => {
        return (
          user.displayName.toLowerCase().includes(queryText) ||
          user.grade.toLowerCase().includes(queryText)
        );
      })
      .slice(0, 10),
    posts: posts
      .filter((post) => {
        return (
          post.content.toLowerCase().includes(queryText) ||
          post.authorName.toLowerCase().includes(queryText)
        );
      })
      .slice(0, 12),
    events: events
      .filter((event) => {
        return (
          event.title.toLowerCase().includes(queryText) ||
          event.description.toLowerCase().includes(queryText) ||
          event.location.toLowerCase().includes(queryText)
        );
      })
      .slice(0, 8),
    clubs: clubs
      .filter((club) => {
        return (
          club.name.toLowerCase().includes(queryText) ||
          club.description.toLowerCase().includes(queryText)
        );
      })
      .slice(0, 8),
    studyGroups: studyGroups
      .filter((group) => {
        return (
          group.className.toLowerCase().includes(queryText) ||
          group.title.toLowerCase().includes(queryText) ||
          group.lastMessage.toLowerCase().includes(queryText)
        );
      })
      .slice(0, 8),
    schoolNews: schoolNews
      .filter((news) => {
        return (
          news.title.toLowerCase().includes(queryText) ||
          news.body.toLowerCase().includes(queryText)
        );
      })
      .slice(0, 8),
    announcements: announcements
      .filter((item) => {
        return (
          item.title.toLowerCase().includes(queryText) ||
          item.body.toLowerCase().includes(queryText) ||
          item.author.toLowerCase().includes(queryText)
        );
      })
      .slice(0, 8),
  };
}

export function subscribeLeaderboard(
  schoolId: string,
  onChange: (users: UserProfile[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return subscribeSchoolUsers(
    schoolId,
    (users) => {
      const ranked = [...users].sort((a, b) => b.xp - a.xp);
      onChange(ranked);
    },
    onError,
  );
}

export async function fetchLeaderboardOnce(schoolId: string): Promise<UserProfile[]> {
  const users = await fetchSchoolUsersOnce(schoolId);
  return [...users].sort((a, b) => b.xp - a.xp);
}

export async function fetchAnnouncements(): Promise<FeedItem[]> {
  const q = query(collection(db, "homeFeed"), orderBy("createdAt", "desc"), limit(10));
  const snap = await getDocs(q);

  if (snap.empty) {
    return [
      {
        id: "fallback_announcement",
        title: "No announcements yet",
        body: "Your FBLA Atlas announcements will show here.",
        author: "FBLA Atlas Team",
        createdAt: new Date().toISOString(),
      },
    ];
  }

  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    return {
      id: docSnap.id,
      title: typeof data.title === "string" ? data.title : "Announcement",
      body: typeof data.body === "string" ? data.body : "",
      author: typeof data.author === "string" ? data.author : "FBLA Atlas Team",
      createdAt: toIso(data.createdAt),
    } satisfies FeedItem;
  });
}

function parseClub(id: string, data: Record<string, unknown>): ClubItem {
  return {
    id,
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    name: typeof data.name === "string" ? data.name : "Club",
    description: typeof data.description === "string" ? data.description : "",
    memberIds: Array.isArray(data.memberIds)
      ? data.memberIds.filter((item): item is string => typeof item === "string")
      : [],
    coverImageUrl:
      typeof data.coverImageUrl === "string"
        ? data.coverImageUrl
        : getClubImageByCategory(
            typeof data.name === "string" ? data.name : "Club",
            typeof data.description === "string" ? data.description : "",
          ),
    postPreview: typeof data.postPreview === "string" ? data.postPreview : "No updates yet.",
  };
}

function parseStudyGroup(id: string, data: Record<string, unknown>): StudyGroupItem {
  return {
    id,
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    className: typeof data.className === "string" ? data.className : "Class",
    title: typeof data.title === "string" ? data.title : "Study Group",
    memberIds: Array.isArray(data.memberIds)
      ? data.memberIds.filter((item): item is string => typeof item === "string")
      : [],
    lastMessage:
      typeof data.lastMessage === "string"
        ? data.lastMessage
        : "Say hi to start this study group.",
    updatedAt: toIso(data.updatedAt),
  };
}

function parseSchoolNews(id: string, data: Record<string, unknown>): SchoolNewsItem {
  return {
    id,
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    title: typeof data.title === "string" ? data.title : "School News",
    body: typeof data.body === "string" ? data.body : "",
    pinned: Boolean(data.pinned),
    bannerUrl:
      typeof data.bannerUrl === "string"
        ? data.bannerUrl
        : getNewsBannerImage(id),
    createdAt: toIso(data.createdAt),
  };
}

export function subscribeClubs(
  schoolId: string,
  onChange: (items: ClubItem[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(collection(db, "clubs"), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((docSnap) => parseClub(docSnap.id, docSnap.data() as Record<string, unknown>))
        .filter((club) => club.schoolId === schoolId);
      onChange(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Clubs subscription failed:", error);
      }
    },
  );
}

export async function fetchClubsOnce(schoolId: string): Promise<ClubItem[]> {
  const snap = await getDocs(query(collection(db, "clubs"), limit(50)));
  return snap.docs
    .map((docSnap) => parseClub(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((club) => club.schoolId === schoolId);
}

export async function toggleJoinClub(club: ClubItem, actor: UserProfile): Promise<boolean> {
  const clubRef = doc(db, "clubs", club.id);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(clubRef);
    if (!snap.exists()) {
      return false;
    }
    const data = snap.data() as Record<string, unknown>;
    const members = Array.isArray(data.memberIds)
      ? data.memberIds.filter((item): item is string => typeof item === "string")
      : [];

    const isMember = members.includes(actor.uid);
    const nextMembers = isMember
      ? members.filter((uid) => uid !== actor.uid)
      : [...members, actor.uid];

    tx.set(
      clubRef,
      {
        memberIds: nextMembers,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return !isMember;
  });
}

export function subscribeStudyGroups(
  schoolId: string,
  onChange: (items: StudyGroupItem[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(collection(db, "studyGroups"), orderBy("updatedAt", "desc"), limit(40));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((docSnap) =>
          parseStudyGroup(docSnap.id, docSnap.data() as Record<string, unknown>),
        )
        .filter((group) => group.schoolId === schoolId);
      onChange(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Study groups subscription failed:", error);
      }
    },
  );
}

export async function fetchStudyGroupsOnce(schoolId: string): Promise<StudyGroupItem[]> {
  const snap = await getDocs(
    query(collection(db, "studyGroups"), orderBy("updatedAt", "desc"), limit(40)),
  );
  return snap.docs
    .map((docSnap) => parseStudyGroup(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((group) => group.schoolId === schoolId);
}

export async function createStudyGroup(
  actor: UserProfile,
  className: string,
  title: string,
): Promise<void> {
  const safeClass = className.trim();
  const safeTitle = title.trim();
  if (!safeClass || !safeTitle) {
    return;
  }
  await addDoc(collection(db, "studyGroups"), {
    schoolId: actor.schoolId,
    className: safeClass,
    title: safeTitle,
    memberIds: [actor.uid],
    lastMessage: `${actor.displayName} created the group.`,
    updatedAt: serverTimestamp(),
  });
}

export async function joinStudyGroup(group: StudyGroupItem, actor: UserProfile): Promise<boolean> {
  const ref = doc(db, "studyGroups", group.id);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      return false;
    }
    const data = snap.data() as Record<string, unknown>;
    const members = Array.isArray(data.memberIds)
      ? data.memberIds.filter((item): item is string => typeof item === "string")
      : [];
    if (members.includes(actor.uid)) {
      return false;
    }
    tx.set(
      ref,
      {
        memberIds: [...members, actor.uid],
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return true;
  });
}

export async function fetchSchoolNewsOnce(schoolId: string): Promise<SchoolNewsItem[]> {
  const snap = await getDocs(
    query(collection(db, "schoolNews"), orderBy("createdAt", "desc"), limit(20)),
  );
  return snap.docs
    .map((docSnap) => parseSchoolNews(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((item) => item.schoolId === schoolId)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));
}

export async function setMoodForUser(
  uid: string,
  emoji: string,
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    moodEmoji: emoji,
    moodUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function fetchRecentActivityForUser(
  schoolId: string,
  uid: string,
): Promise<ActivityItem[]> {
  const snap = await getDocs(
    query(collection(db, "activities"), orderBy("createdAt", "desc"), limit(40)),
  );
  return snap.docs
    .map((docSnap) => parseActivity(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((item) => item.schoolId === schoolId && item.actorId === uid)
    .slice(0, 8);
}
