import bokChoyCropIcon from "../../assets/garden/bok-choy-crop.png";
import bokChoySeedIcon from "../../assets/garden/bok-choy-seed.png";
import cabbageCropIcon from "../../assets/garden/cabbage-crop.png";
import cabbageSeedIcon from "../../assets/garden/cabbage-seed.png";
import cornCropIcon from "../../assets/garden/corn-crop.png";
import cornSeedIcon from "../../assets/garden/corn-seed.png";
import peaCropIcon from "../../assets/garden/pea-crop.png";
import peaSeedIcon from "../../assets/garden/pea-seed.png";
import pumpkinCropIcon from "../../assets/garden/pumpkin-crop.png";
import pumpkinSeedIcon from "../../assets/garden/pumpkin-seed.png";
import tomatoCropIcon from "../../assets/garden/tomato-crop.png";
import tomatoSeedIcon from "../../assets/garden/tomato-seed.png";
import type { HistoryItem, PlantedCrop, RestState } from "../../types";

export type HistoryCell = HistoryItem & {
  fillRatio: number;
};

export type CropDefinition = {
  cropType: string;
  seedType: string;
  tier: number;
  cropLabel: string;
  seedLabel: string;
  cropIcon: string;
  seedIcon: string;
};

export type ExchangeOption = {
  sourceCropType: string;
  targetSeedType: string;
  cost: number;
};

export const BASIC_SEED_TYPE = "bokChoySeed";
export const ADVANCED_SEED_TYPE = "cabbageSeed";
export const PEA_SEED_TYPE = "peaSeed";
export const TOMATO_SEED_TYPE = "tomatoSeed";
export const CORN_SEED_TYPE = "cornSeed";
export const PUMPKIN_SEED_TYPE = "pumpkinSeed";
export const BASIC_CROP_TYPE = "bokChoy";
export const ADVANCED_CROP_TYPE = "cabbage";
export const PEA_CROP_TYPE = "pea";
export const TOMATO_CROP_TYPE = "tomato";
export const CORN_CROP_TYPE = "corn";
export const PUMPKIN_CROP_TYPE = "pumpkin";
export const DAY_MS = 24 * 60 * 60 * 1000;

export const CROP_DEFINITIONS: CropDefinition[] = [
  {
    cropType: BASIC_CROP_TYPE,
    seedType: BASIC_SEED_TYPE,
    tier: 1,
    cropLabel: "小青菜",
    seedLabel: "小青菜",
    cropIcon: bokChoyCropIcon,
    seedIcon: bokChoySeedIcon
  },
  {
    cropType: ADVANCED_CROP_TYPE,
    seedType: ADVANCED_SEED_TYPE,
    tier: 1,
    cropLabel: "卷心菜",
    seedLabel: "卷心菜",
    cropIcon: cabbageCropIcon,
    seedIcon: cabbageSeedIcon
  },
  {
    cropType: PEA_CROP_TYPE,
    seedType: PEA_SEED_TYPE,
    tier: 1,
    cropLabel: "豌豆",
    seedLabel: "豌豆",
    cropIcon: peaCropIcon,
    seedIcon: peaSeedIcon
  },
  {
    cropType: TOMATO_CROP_TYPE,
    seedType: TOMATO_SEED_TYPE,
    tier: 2,
    cropLabel: "西红柿",
    seedLabel: "西红柿",
    cropIcon: tomatoCropIcon,
    seedIcon: tomatoSeedIcon
  },
  {
    cropType: CORN_CROP_TYPE,
    seedType: CORN_SEED_TYPE,
    tier: 2,
    cropLabel: "玉米",
    seedLabel: "玉米",
    cropIcon: cornCropIcon,
    seedIcon: cornSeedIcon
  },
  {
    cropType: PUMPKIN_CROP_TYPE,
    seedType: PUMPKIN_SEED_TYPE,
    tier: 3,
    cropLabel: "南瓜",
    seedLabel: "南瓜",
    cropIcon: pumpkinCropIcon,
    seedIcon: pumpkinSeedIcon
  }
];

export const EXCHANGE_OPTIONS: ExchangeOption[] = CROP_DEFINITIONS.flatMap((source) =>
  CROP_DEFINITIONS.filter((target) => {
    if (target.seedType === source.seedType) {
      return false;
    }
    return target.tier === source.tier || target.tier === source.tier + 1;
  }).map((target) => ({
    sourceCropType: source.cropType,
    targetSeedType: target.seedType,
    cost: target.tier === source.tier ? 1 : 3
  }))
);

export function buildHistoryGrid(history: HistoryItem[], days = 56) {
  const map = new Map(history.map((item) => [item.dayKey, item]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: HistoryCell[] = [];
  for (let index = 0; index < days; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const dayKey = date.toISOString().slice(0, 10);
    const entry = map.get(dayKey);

    if (entry) {
      const fillRatio =
        entry.targetMl > 0 ? Math.min(1, entry.actualIntakeMl / entry.targetMl) : 0;
      cells.push({ ...entry, fillRatio });
      continue;
    }

    cells.push({
      dayKey,
      targetMl: 0,
      actualIntakeMl: 0,
      consumedMl: 0,
      debtIncurredMl: 0,
      goalMet: false,
      completedReminderSlots: 0,
      missedReminderSlots: 0,
      fillRatio: 0
    });
  }

  return cells;
}

export function getCellFillClass(cell: HistoryCell) {
  if (cell.targetMl <= 0 || cell.actualIntakeMl <= 0) {
    return "bg-transparent";
  }
  if (cell.goalMet) {
    return cell.fillRatio >= 1 ? "bg-emerald-400" : "bg-emerald-500/80";
  }
  if (cell.fillRatio >= 0.7) {
    return "bg-sky-400";
  }
  if (cell.fillRatio >= 0.4) {
    return "bg-cyan-500/70";
  }
  if (cell.fillRatio >= 0.2) {
    return "bg-amber-500/70";
  }
  return "bg-rose-500/70";
}

export function getRequiredGrowthDays(cell: HistoryCell) {
  if (cell.actualIntakeMl <= 0) {
    return 0;
  }
  if (cell.targetMl <= 0) {
    return 1;
  }

  const completionPercent = Math.floor((cell.actualIntakeMl / cell.targetMl) * 100);
  if (completionPercent >= 100) {
    return 1;
  }
  if (completionPercent >= 70) {
    return 2;
  }
  if (completionPercent >= 40) {
    return 3;
  }
  return 4;
}

export function getCropGrowth(cell: HistoryCell, crop: PlantedCrop | undefined) {
  if (!crop) {
    return {
      requiredDays: getRequiredGrowthDays(cell),
      growthPercent: 0,
      mature: false
    };
  }

  const requiredDays = getRequiredGrowthDays(cell);
  if (requiredDays <= 0) {
    return { requiredDays, growthPercent: 0, mature: false };
  }

  const plantedTime = new Date(crop.plantedAt).getTime();
  const elapsedMs = Number.isNaN(plantedTime) ? 0 : Math.max(0, Date.now() - plantedTime);
  const boostedMs = crop.boostAppliedSeconds * 1000;
  const growthPercent = Math.min(
    100,
    Math.floor(((elapsedMs + boostedMs) / (requiredDays * DAY_MS)) * 100)
  );

  return {
    requiredDays,
    growthPercent,
    mature: growthPercent >= 100
  };
}

export function sumInventoryByKey<T extends string>(items: Array<{ key: T; count: number }>) {
  const totals = new Map<T, number>();
  for (const item of items) {
    totals.set(item.key, (totals.get(item.key) ?? 0) + item.count);
  }
  return totals;
}

export function getUpcomingBoostHours(
  restState: RestState,
  cooldownRemainingSeconds: number
) {
  if (restState.active) {
    return Math.max(1, Math.round(restState.plannedBoostSeconds / 3600));
  }
  if (cooldownRemainingSeconds > 0) {
    return 1;
  }

  const cooldownEndsAt = restState.cooldownEndsAt
    ? new Date(restState.cooldownEndsAt).getTime()
    : Number.NaN;
  if (Number.isNaN(cooldownEndsAt)) {
    return 3;
  }

  const elapsedSinceCooldownEndMs = Math.max(0, Date.now() - cooldownEndsAt);
  if (elapsedSinceCooldownEndMs < 60 * 60 * 1000) {
    return 1;
  }
  if (elapsedSinceCooldownEndMs < 120 * 60 * 1000) {
    return 2;
  }
  return 3;
}

export function getCropDefinitionBySeed(seedType: string) {
  return (
    CROP_DEFINITIONS.find((definition) => definition.seedType === seedType) ?? CROP_DEFINITIONS[0]
  );
}

export function getCropDefinitionByCrop(cropType: string) {
  return (
    CROP_DEFINITIONS.find((definition) => definition.cropType === cropType) ?? CROP_DEFINITIONS[0]
  );
}
