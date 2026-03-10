import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

import { db } from "../config/firebase";
import { POINT_VALUES, getTierForXp } from "../constants/gamification";
import { PointAction, PointAwardResult } from "../types/social";
import { todayKey } from "./firestoreUtils";
import { createUserNotification } from "./notificationService";
import { createDefaultUserProfile } from "./userService";

function daysBetween(a: string, b: string): number {
  const aDate = new Date(`${a}T00:00:00`);
  const bDate = new Date(`${b}T00:00:00`);
  const diff = bDate.getTime() - aDate.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

type AwardContext = {
  eventName?: string;
  streakCount?: number;
};

const ONE_TIME_MILESTONES: Partial<Record<PointAction, string>> = {
  first_post_bonus: "first_post_bonus",
  profile_completed_bonus: "profile_completed_bonus",
};

function xpBodyForAction(action: PointAction, points: number, context?: AwardContext): string {
  switch (action) {
    case "attending_event":
      return `+${points} XP - You're going to ${context?.eventName ?? "that event"}!`;
    case "posting":
      return `+${points} XP - Nice post!`;
    case "commenting":
      return `+${points} XP - Keep the convo going!`;
    case "likes_received":
      return `+${points} XP - Someone liked your post!`;
    case "liking_post":
      return `+${points} XP - You liked a post.`;
    case "daily_login":
      return `+${points} XP - Day ${context?.streakCount ?? 1} streak!`;
    case "following_user":
      return `+${points} XP - Growing your network!`;
    case "messaging_new":
      return `+${points} XP - New conversation started!`;
    case "complete_practice_test":
      return `+${points} XP - Practice test complete!`;
    case "score_90_bonus":
      return `+${points} XP - 90%+ bonus unlocked!`;
    case "complete_flashcard_deck":
      return `+${points} XP - Flashcard deck complete!`;
    case "complete_presentation":
      return `+${points} XP - Presentation practice complete!`;
    case "complete_mock_judge":
      return `+${points} XP - Mock judge session complete!`;
    case "duel_win":
      return `+${points} XP - You won a head-to-head challenge!`;
    case "duel_loss":
      return `+${points} XP - Challenge complete. Keep training.`;
    case "duel_correct_answer":
      return `+${points} XP - Correct duel answers bonus.`;
    case "seven_day_streak_bonus":
      return `+${points} XP - 7-day streak bonus!`;
    case "perfect_test_score":
      return `+${points} XP - Perfect score bonus!`;
    case "first_post_bonus":
      return `+${points} XP - First post bonus!`;
    case "profile_completed_bonus":
      return `+${points} XP - Profile completed!`;
    default:
      return `+${points} XP`;
  }
}

async function writeAwardNotifications(uid: string, result: PointAwardResult): Promise<void> {
  await createUserNotification(uid, {
    type: "xp",
    title: "XP Earned",
    body: xpBodyForAction(result.action, result.pointsAwarded, {
      eventName: result.context?.eventName,
      streakCount: result.streakCount,
    }),
    metadata: {
      action: result.action,
      points: String(result.pointsAwarded),
      ...(result.context ?? {}),
    },
  });

  if (result.tierUpgraded) {
    await createUserNotification(uid, {
      type: "tier_upgrade",
      title: "Tier Upgrade",
      body: `You reached ${result.newTier.name}! Keep it up!`,
      metadata: {
        fromTier: result.previousTier.name,
        toTier: result.newTier.name,
      },
    });
  }

  if (result.action === "daily_login" && (result.streakCount ?? 0) > 1) {
    const streakBody =
      (result.streakCount ?? 0) % 7 === 0
        ? `Day ${result.streakCount} streak! +${POINT_VALUES.seven_day_streak_bonus} XP bonus.`
        : `Day ${result.streakCount} streak!`;
    await createUserNotification(uid, {
      type: "streak",
      title: "Streak Bonus",
      body: streakBody,
      metadata: {
        streakCount: String(result.streakCount ?? 0),
      },
    });
  }
}

export async function awardPointsToUser(
  uid: string,
  action: PointAction,
  context?: AwardContext,
  pointsOverride?: number,
): Promise<PointAwardResult> {
  const userRef = doc(db, "users", uid);

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const base = createDefaultUserProfile(uid);
    const data = snap.exists()
      ? ({ ...base, ...(snap.data() as Record<string, unknown>) } as Record<string, unknown>)
      : (base as unknown as Record<string, unknown>);

    const previousXp = typeof data.xp === "number" ? data.xp : 0;

    const previousTier = getTierForXp(previousXp);

    const currentPointMap =
      typeof data.pointsByAction === "object" && data.pointsByAction !== null
        ? (data.pointsByAction as Record<string, number>)
        : {};
    const currentBadges = Array.isArray(data.badges)
      ? data.badges.filter((item): item is string => typeof item === "string")
      : [];
    const currentMilestones = Array.isArray(data.xpMilestones)
      ? data.xpMilestones.filter((item): item is string => typeof item === "string")
      : [];
    const nextMilestones = [...currentMilestones];
    const journeyMilestones = Array.isArray(data.milestones)
      ? data.milestones.filter(
          (item): item is { id: string; type: string; date: string; description: string } =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof (item as { id?: unknown }).id === "string" &&
            typeof (item as { date?: unknown }).date === "string" &&
            typeof (item as { description?: unknown }).description === "string",
        )
      : [];
    const nextJourneyMilestones = [...journeyMilestones];
    const nextBadges = [...currentBadges];

    let pointsAwarded =
      typeof pointsOverride === "number" && Number.isFinite(pointsOverride)
        ? Math.max(0, pointsOverride)
        : POINT_VALUES[action] ?? 0;
    let firstPostBonusAwarded = 0;

    const oneTimeMilestone = ONE_TIME_MILESTONES[action];
    const alreadyCompletedOneTime =
      Boolean(oneTimeMilestone) && currentMilestones.includes(oneTimeMilestone as string);
    if (alreadyCompletedOneTime) {
      pointsAwarded = 0;
    } else if (oneTimeMilestone && pointsAwarded > 0) {
      nextMilestones.push(oneTimeMilestone);
    }

    if (action === "posting" && !currentMilestones.includes("first_post_bonus")) {
      firstPostBonusAwarded = POINT_VALUES.first_post_bonus;
      nextMilestones.push("first_post_bonus");
      nextJourneyMilestones.unshift({
        id: `first_post_${Date.now()}`,
        type: "first_post",
        date: new Date().toISOString(),
        description: "Published your first FBLA post",
      });
    }

    const totalAwarded = pointsAwarded + firstPostBonusAwarded;
    const newXp = previousXp + totalAwarded;
    const newTier = getTierForXp(newXp);

    if (action === "posting" && !nextBadges.includes("First Post")) {
      nextBadges.push("First Post");
    }

    if (action === "attending_event" && newXp >= 200 && !nextBadges.includes("Event Veteran")) {
      nextBadges.push("Event Veteran");
    }

    if (newXp >= 1200 && !nextBadges.includes("Social Butterfly")) {
      nextBadges.push("Social Butterfly");
    }

    if (action === "profile_completed_bonus" && !currentMilestones.includes("profile_completed_bonus")) {
      nextJourneyMilestones.unshift({
        id: `profile_complete_${Date.now()}`,
        type: "profile_complete",
        date: new Date().toISOString(),
        description: "Completed your profile setup",
      });
    }

    if (previousTier.name !== newTier.name) {
      nextJourneyMilestones.unshift({
        id: `tier_${newTier.name.toLowerCase()}_${Date.now()}`,
        type: "tier_upgrade",
        date: new Date().toISOString(),
        description: `Reached ${newTier.name} tier`,
      });
    }

    tx.set(
      userRef,
      {
        xp: newXp,
        tier: newTier.name,
        updatedAt: serverTimestamp(),
        badges: nextBadges,
        xpMilestones: Array.from(new Set(nextMilestones)),
        milestones: nextJourneyMilestones.slice(0, 120),
        pointsByAction: {
          ...currentPointMap,
          [action]: (currentPointMap[action] || 0) + pointsAwarded,
          ...(firstPostBonusAwarded > 0
            ? {
                first_post_bonus:
                  (currentPointMap.first_post_bonus || 0) + firstPostBonusAwarded,
              }
            : {}),
        },
      },
      { merge: true },
    );

    const cleanContext = Object.fromEntries(
      Object.entries(context ?? {}).filter(([, value]) => value !== undefined && value !== null),
    ) as Record<string, string>;

    return {
      action,
      pointsAwarded: totalAwarded,
      previousXp,
      newXp,
      previousTier,
      newTier,
      tierUpgraded: previousTier.name !== newTier.name,
      context: Object.keys(cleanContext).length > 0 ? cleanContext : undefined,
    };
  });

  await writeAwardNotifications(uid, result);
  return result;
}

let loginProcessedForDay = "";
const processedLoginUsers = new Set<string>();

export async function handleDailyLogin(uid: string): Promise<PointAwardResult | null> {
  const today = todayKey();
  if (loginProcessedForDay !== today) {
    loginProcessedForDay = today;
    processedLoginUsers.clear();
  }
  if (processedLoginUsers.has(uid)) {
    return null;
  }

  const userRef = doc(db, "users", uid);

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const base = createDefaultUserProfile(uid);
    const data = snap.exists()
      ? ({ ...base, ...(snap.data() as Record<string, unknown>) } as Record<string, unknown>)
      : (base as unknown as Record<string, unknown>);

    const lastLoginDate =
      typeof data.lastLoginDate === "string"
        ? data.lastLoginDate
        : typeof data.lastDailyLoginDate === "string"
          ? data.lastDailyLoginDate
          : null;
    const previousStreak =
      typeof data.currentStreak === "number"
        ? data.currentStreak
        : typeof data.streakCount === "number"
          ? data.streakCount
          : 0;
    const previousLongest =
      typeof data.longestStreak === "number" ? data.longestStreak : Math.max(previousStreak, 0);

    if (lastLoginDate === today) {
      return null;
    }

    let nextStreak = 1;
    if (lastLoginDate) {
      const dayGap = daysBetween(lastLoginDate, today);
      if (dayGap === 1) {
        nextStreak = previousStreak + 1;
      } else if (dayGap === 0) {
        return null;
      }
    }
    const nextLongest = Math.max(previousLongest, nextStreak);

    const previousXp = typeof data.xp === "number" ? data.xp : 0;
    const dailyLoginPoints = POINT_VALUES.daily_login;
    const streakBonusPoints = nextStreak > 0 && nextStreak % 7 === 0 ? POINT_VALUES.seven_day_streak_bonus : 0;
    const pointsAwarded = dailyLoginPoints + streakBonusPoints;
    const newXp = previousXp + pointsAwarded;

    const previousTier = getTierForXp(previousXp);
    const newTier = getTierForXp(newXp);

    const currentPointMap =
      typeof data.pointsByAction === "object" && data.pointsByAction !== null
        ? (data.pointsByAction as Record<string, number>)
        : {};
    const currentBadges = Array.isArray(data.badges)
      ? data.badges.filter((item): item is string => typeof item === "string")
      : [];
    const journeyMilestones = Array.isArray(data.milestones)
      ? data.milestones.filter(
          (item): item is { id: string; type: string; date: string; description: string } =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof (item as { id?: unknown }).id === "string" &&
            typeof (item as { date?: unknown }).date === "string" &&
            typeof (item as { description?: unknown }).description === "string",
        )
      : [];
    const nextJourneyMilestones = [...journeyMilestones];
    const nextBadges = [...currentBadges];
    if (nextStreak >= 3 && !nextBadges.includes("Streak Starter")) {
      nextBadges.push("Streak Starter");
    }
    if (nextStreak >= 7 && !nextBadges.includes("Consistency Pro")) {
      nextBadges.push("Consistency Pro");
    }
    nextJourneyMilestones.unshift({
      id: `daily_login_${today}`,
      type: "daily_login",
      date: new Date().toISOString(),
      description: `Logged in and continued your streak (Day ${nextStreak})`,
    });
    if (streakBonusPoints > 0) {
      nextJourneyMilestones.unshift({
        id: `streak_bonus_${today}_${nextStreak}`,
        type: "streak_bonus",
        date: new Date().toISOString(),
        description: `Hit a ${nextStreak}-day streak bonus`,
      });
    }
    if (previousTier.name !== newTier.name) {
      nextJourneyMilestones.unshift({
        id: `tier_${newTier.name.toLowerCase()}_${today}`,
        type: "tier_upgrade",
        date: new Date().toISOString(),
        description: `Reached ${newTier.name} tier`,
      });
    }

    tx.set(
      userRef,
      {
        xp: newXp,
        tier: newTier.name,
        lastLoginDate: today,
        lastDailyLoginDate: today,
        currentStreak: nextStreak,
        longestStreak: nextLongest,
        streakCount: nextStreak,
        updatedAt: serverTimestamp(),
        badges: nextBadges,
        milestones: nextJourneyMilestones.slice(0, 120),
        pointsByAction: {
          ...currentPointMap,
          daily_login: (currentPointMap.daily_login || 0) + dailyLoginPoints,
          ...(streakBonusPoints > 0
            ? {
                seven_day_streak_bonus:
                  (currentPointMap.seven_day_streak_bonus || 0) + streakBonusPoints,
              }
            : {}),
        },
      },
      { merge: true },
    );

    return {
      action: "daily_login" as const,
      pointsAwarded,
      previousXp,
      newXp,
      previousTier,
      newTier,
      tierUpgraded: previousTier.name !== newTier.name,
      streakCount: nextStreak,
      context: {
        streakCount: String(nextStreak),
      },
    };
  });

  processedLoginUsers.add(uid);

  if (result) {
    await writeAwardNotifications(uid, result);
  }

  return result;
}

export async function awardDailyLoginIfNeeded(uid: string): Promise<PointAwardResult | null> {
  return handleDailyLogin(uid);
}

