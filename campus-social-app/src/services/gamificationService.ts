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

function xpBodyForAction(action: PointAction, points: number, context?: AwardContext): string {
  switch (action) {
    case "attending_event":
      return `?? +${points} XP — You're going to ${context?.eventName ?? "that event"}!`;
    case "posting":
      return `?? +${points} XP — Nice post!`;
    case "commenting":
      return `?? +${points} XP — Keep the convo going!`;
    case "likes_received":
      return `?? +${points} XP — Someone liked your post!`;
    case "daily_login":
      return `?? +${points} XP — Day ${context?.streakCount ?? 1} streak!`;
    case "following_user":
      return `? +${points} XP — Growing your network!`;
    case "messaging_new":
      return `?? +${points} XP — New conversation started!`;
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
      body: `?? You reached ${result.newTier.name}! Keep it up!`,
      metadata: {
        fromTier: result.previousTier.name,
        toTier: result.newTier.name,
      },
    });
  }

  if (result.action === "daily_login" && (result.streakCount ?? 0) > 1) {
    await createUserNotification(uid, {
      type: "streak",
      title: "Streak Bonus",
      body: `?? Day ${result.streakCount} streak!`,
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
): Promise<PointAwardResult> {
  const userRef = doc(db, "users", uid);

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const base = createDefaultUserProfile(uid);
    const data = snap.exists()
      ? ({ ...base, ...(snap.data() as Record<string, unknown>) } as Record<string, unknown>)
      : (base as unknown as Record<string, unknown>);

    const previousXp = typeof data.xp === "number" ? data.xp : 0;
    const pointsAwarded = POINT_VALUES[action];
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
    const nextBadges = [...currentBadges];

    if (action === "posting" && !nextBadges.includes("First Post")) {
      nextBadges.push("First Post");
    }

    if (action === "attending_event" && newXp >= 200 && !nextBadges.includes("Event Veteran")) {
      nextBadges.push("Event Veteran");
    }

    if (newXp >= 1200 && !nextBadges.includes("Social Butterfly")) {
      nextBadges.push("Social Butterfly");
    }

    tx.set(
      userRef,
      {
        xp: newXp,
        tier: newTier.name,
        updatedAt: serverTimestamp(),
        badges: nextBadges,
        pointsByAction: {
          ...currentPointMap,
          [action]: (currentPointMap[action] || 0) + pointsAwarded,
        },
      },
      { merge: true },
    );

    const cleanContext = Object.fromEntries(
      Object.entries(context ?? {}).filter(([, value]) => value !== undefined && value !== null),
    ) as Record<string, string>;

    return {
      action,
      pointsAwarded,
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

export async function awardDailyLoginIfNeeded(uid: string): Promise<PointAwardResult | null> {
  const userRef = doc(db, "users", uid);
  const today = todayKey();

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const base = createDefaultUserProfile(uid);
    const data = snap.exists()
      ? ({ ...base, ...(snap.data() as Record<string, unknown>) } as Record<string, unknown>)
      : (base as unknown as Record<string, unknown>);

    const lastDailyLoginDate =
      typeof data.lastDailyLoginDate === "string" ? data.lastDailyLoginDate : null;
    const previousStreak = typeof data.streakCount === "number" ? data.streakCount : 0;

    if (lastDailyLoginDate === today) {
      return null;
    }

    let nextStreak = 1;
    if (lastDailyLoginDate) {
      const dayGap = daysBetween(lastDailyLoginDate, today);
      if (dayGap === 1) {
        nextStreak = previousStreak + 1;
      } else if (dayGap === 0) {
        return null;
      }
    }

    const previousXp = typeof data.xp === "number" ? data.xp : 0;
    const pointsAwarded = POINT_VALUES.daily_login;
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
    const nextBadges = [...currentBadges];
    if (nextStreak >= 3 && !nextBadges.includes("Streak Starter")) {
      nextBadges.push("Streak Starter");
    }
    if (nextStreak >= 7 && !nextBadges.includes("Consistency Pro")) {
      nextBadges.push("Consistency Pro");
    }

    tx.set(
      userRef,
      {
        xp: newXp,
        tier: newTier.name,
        lastDailyLoginDate: today,
        streakCount: nextStreak,
        updatedAt: serverTimestamp(),
        badges: nextBadges,
        pointsByAction: {
          ...currentPointMap,
          daily_login: (currentPointMap.daily_login || 0) + pointsAwarded,
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

  if (result) {
    await writeAwardNotifications(uid, result);
  }

  return result;
}

