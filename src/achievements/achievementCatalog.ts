import type {
  AchievementId,
  AchievementReceipt,
  GardenState,
  HistoryItem
} from "../types";

export type AchievementTier = "simple" | "hard";

export type AchievementDefinition = {
  id: AchievementId;
  tier: AchievementTier;
  target: number;
};

export type AchievementProgress = {
  current: number;
  target: number;
};

export type AchievementViewModel = AchievementDefinition & {
  frame: AchievementTier;
  isUnlocked: boolean;
  unlockedAt: string | null;
  progress: AchievementProgress;
};

export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
  { id: "first_sip", tier: "simple", target: 1 },
  { id: "first_goal", tier: "simple", target: 1 },
  { id: "first_reminder_answer", tier: "simple", target: 1 },
  { id: "first_plant", tier: "simple", target: 1 },
  { id: "first_harvest", tier: "simple", target: 1 },
  { id: "first_background", tier: "simple", target: 1 },
  { id: "drink_streak_7", tier: "hard", target: 7 },
  { id: "goal_streak_7", tier: "hard", target: 7 },
  { id: "drink_streak_30", tier: "hard", target: 30 },
  { id: "harvest_10", tier: "hard", target: 10 },
  { id: "same_crop_5", tier: "hard", target: 5 },
  { id: "crop_varieties_3", tier: "hard", target: 3 }
] as const;

export function getAchievementProgress(
  id: AchievementId,
  history: HistoryItem[],
  garden: GardenState
): AchievementProgress {
  const definition = ACHIEVEMENT_CATALOG.find((item) => item.id === id);
  if (!definition) {
    return { current: 0, target: 1 };
  }

  const totalHarvests = garden.collection.reduce(
    (total, item) => total + item.harvestCount,
    0
  );
  const current = (() => {
    switch (id) {
      case "first_sip":
        return history.some((item) => item.actualIntakeMl > 0) ? 1 : 0;
      case "first_goal":
        return history.some(
          (item) => item.targetMl > 0 && item.actualIntakeMl >= item.targetMl
        )
          ? 1
          : 0;
      case "first_reminder_answer":
        return history.some((item) => item.completedReminderSlots > 0) ? 1 : 0;
      case "first_plant":
        return garden.crops.length > 0 || totalHarvests > 0 ? 1 : 0;
      case "first_harvest":
        return Math.min(totalHarvests, 1);
      case "first_background":
        return garden.unlockedBackgrounds.length > 0 ? 1 : 0;
      case "drink_streak_7":
      case "drink_streak_30":
        return longestDailyStreak(history, (item) => item.actualIntakeMl > 0);
      case "goal_streak_7":
        return longestDailyStreak(
          history,
          (item) => item.targetMl > 0 && item.actualIntakeMl >= item.targetMl
        );
      case "harvest_10":
        return totalHarvests;
      case "same_crop_5":
        return garden.collection.reduce(
          (best, item) => Math.max(best, item.harvestCount),
          0
        );
      case "crop_varieties_3":
        return new Set(
          garden.collection
            .filter((item) => item.harvestCount > 0)
            .map((item) => item.cropType)
        ).size;
    }
  })();

  return {
    current: Math.min(current, definition.target),
    target: definition.target
  };
}

export function buildAchievementViewModels(
  receipts: AchievementReceipt[],
  history: HistoryItem[],
  garden: GardenState
): AchievementViewModel[] {
  const receiptById = new Map(receipts.map((receipt) => [receipt.achievementId, receipt]));
  return ACHIEVEMENT_CATALOG.map((definition) => {
    const receipt = receiptById.get(definition.id);
    return {
      ...definition,
      frame: definition.tier,
      isUnlocked: Boolean(receipt),
      unlockedAt: receipt?.unlockedAt ?? null,
      progress: getAchievementProgress(definition.id, history, garden)
    };
  }).sort((left, right) => {
    if (left.isUnlocked !== right.isUnlocked) {
      return left.isUnlocked ? -1 : 1;
    }
    if (left.isUnlocked && right.isUnlocked) {
      return (right.unlockedAt ?? "").localeCompare(left.unlockedAt ?? "");
    }
    return 0;
  });
}

function longestDailyStreak(
  history: HistoryItem[],
  qualifies: (item: HistoryItem) => boolean
) {
  const qualifyingDays = new Set(
    history.filter(qualifies).map((item) => item.dayKey)
  );
  let longest = 0;

  for (const dayKey of qualifyingDays) {
    const previousDay = shiftDayKey(dayKey, -1);
    if (qualifyingDays.has(previousDay)) {
      continue;
    }

    let length = 1;
    while (qualifyingDays.has(shiftDayKey(dayKey, length))) {
      length += 1;
    }
    longest = Math.max(longest, length);
  }

  return longest;
}

function shiftDayKey(dayKey: string, amount: number) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
