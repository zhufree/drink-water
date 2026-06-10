import { SEED_EXCHANGE_CONFIG } from "../config/seedExchange";
import type { GardenState, Locale, Settings } from "../types";

export type TabKey = "today" | "history" | "leaderboard" | "settings";
export type CirclesLoadState = "loading" | "ready" | "error";
export type CloudIdentityState = "loading" | "ready" | "error";
export type NicknameSaveState = "idle" | "success" | "error";

export const APP_VERSION = "0.6.2";
export const RELEASE_URL = "https://github.com/zhufree/drink-water/releases";
export const COPYRIGHT = "Copyright (c) 2026 zhufree";

export const defaultSettings: Settings = {
  dailyTargetMl: 2000,
  cupSizeMl: 250,
  cupStepMl: 50,
  panelOpacityPercent: 68,
  panelBlurPx: 8,
  deviceId: "",
  displayName: "",
  activeCircleCode: "",
  activeCircleName: "",
  reminderIntervalMinutes: 60,
  activeStartHour: 9,
  activeEndHour: 22,
  notificationsEnabled: true,
  autostartEnabled: false,
  locale: "zh-CN"
};

export const defaultGardenState: GardenState = {
  initialGrantClaimed: true,
  produceMigrationClaimed: true,
  seeds: [],
  produce: [],
  crops: [],
  collection: [],
  activeBackground: "default",
  unlockedBackgrounds: [],
  rest: {
    active: false,
    startedAt: null,
    endsAt: null,
    cooldownEndsAt: null,
    maxDurationSeconds: 0,
    plannedBoostSeconds: 0
  }
};

export function getSeedDisplayName(seedType: string, locale: Locale) {
  const seed = SEED_EXCHANGE_CONFIG.seeds.find(
    (item) => item.seedType === seedType || item.seedAliases.includes(seedType)
  );

  return seed?.label[locale] ?? seed?.label["zh-CN"] ?? SEED_EXCHANGE_CONFIG.seeds[0].label[locale];
}
