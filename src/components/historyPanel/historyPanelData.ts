import phase0Icon from "../../assets/garden/phase-0.png";
import phase1Icon from "../../assets/garden/phase-1.png";
import phase2Icon from "../../assets/garden/phase-2.png";
import type { HistoryItem, PlantedCrop, RestState } from "../../types";
import { formatLocalDayKey } from "../../hooks/appControllerUtils";
import { CROP_DEFINITIONS, EXCHANGE_OPTIONS } from "../../config/seedExchange";
import type { CropDefinition, ExchangeOption } from "../../config/seedExchange";

export type HistoryCell = HistoryItem & {
  fillRatio: number;
};

export const BASIC_SEED_TYPE = "potatoSeed";
export const ADVANCED_SEED_TYPE = "bellPepperSeed";
export const CARROT_SEED_TYPE = "carrotSeed";
export const NAPA_CABBAGE_SEED_TYPE = "napaCabbageSeed";
export const BROCCOLI_SEED_TYPE = "broccoliSeed";
export const RADISH_SEED_TYPE = "radishSeed";
export const RED_RADISH_SEED_TYPE = "redRadishSeed";
export const PUMPKIN_SEED_TYPE = "pumpkinSeed";
export const ONION_SEED_TYPE = "onionSeed";
export const EGGPLANT_SEED_TYPE = "eggplantSeed";
export const PEA_SEED_TYPE = "gardenPeaSeed";
export const BASIC_CROP_TYPE = "potato";
export const ADVANCED_CROP_TYPE = "bellPepper";
export const CARROT_CROP_TYPE = "carrot";
export const NAPA_CABBAGE_CROP_TYPE = "napaCabbage";
export const BROCCOLI_CROP_TYPE = "broccoli";
export const RADISH_CROP_TYPE = "radish";
export const RED_RADISH_CROP_TYPE = "redRadish";
export const PUMPKIN_CROP_TYPE = "pumpkin";
export const ONION_CROP_TYPE = "onion";
export const EGGPLANT_CROP_TYPE = "eggplant";
export const PEA_CROP_TYPE = "gardenPea";
export const DAY_MS = 24 * 60 * 60 * 1000;

export { CROP_DEFINITIONS, EXCHANGE_OPTIONS };
export type { CropDefinition, ExchangeOption };

export function buildHistoryGrid(history: HistoryItem[], days = 56, startOffsetDays = 1) {
  const map = new Map(history.map((item) => [item.dayKey, item]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: HistoryCell[] = [];
  for (let index = 0; index < days; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index - startOffsetDays);
    const dayKey = formatLocalDayKey(date);
    const entry = map.get(dayKey);

    if (entry) {
      const fillRatio = entry.targetMl > 0 ? Math.min(1, entry.actualIntakeMl / entry.targetMl) : 0;
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

export function getCropGrowthStage(growthPercent: number) {
  if (growthPercent >= 75) {
    return 3;
  }
  if (growthPercent >= 50) {
    return 2;
  }
  if (growthPercent >= 25) {
    return 1;
  }
  return 0;
}

export function getCropGrowth(cell: HistoryCell, crop: PlantedCrop | undefined) {
  if (!crop) {
    return {
      requiredDays: getRequiredGrowthDays(cell),
      growthPercent: 0,
      stage: 0,
      mature: false
    };
  }

  const requiredDays = getRequiredGrowthDays(cell);
  if (requiredDays <= 0) {
    return { requiredDays, growthPercent: 0, stage: 0, mature: false };
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
    stage: getCropGrowthStage(growthPercent),
    mature: growthPercent >= 100
  };
}

export function getCropStageIcon(stage: number) {
  if (stage <= 0) {
    return phase0Icon;
  }
  if (stage === 1) {
    return phase1Icon;
  }
  return phase2Icon;
}

export function sumInventoryByKey<T extends string>(items: Array<{ key: T; count: number }>) {
  const totals = new Map<T, number>();
  for (const item of items) {
    totals.set(item.key, (totals.get(item.key) ?? 0) + item.count);
  }
  return totals;
}

export function getUpcomingBoostHours(restState: RestState, cooldownRemainingSeconds: number) {
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
  return CROP_DEFINITIONS.find((definition) => definition.seedType === seedType) ?? CROP_DEFINITIONS[0];
}

export function getCropDefinitionByCrop(cropType: string) {
  return CROP_DEFINITIONS.find((definition) => definition.cropType === cropType) ?? CROP_DEFINITIONS[0];
}
