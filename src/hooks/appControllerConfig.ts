import type { GardenState, Locale, Settings } from "../types";

export type TabKey = "today" | "history" | "leaderboard" | "settings";
export type CirclesLoadState = "loading" | "ready" | "error";
export type CloudIdentityState = "loading" | "ready" | "error";
export type NicknameSaveState = "idle" | "success" | "error";

export const APP_VERSION = "0.5.5";
export const RELEASE_URL = "https://github.com/zhufree/drink-water/releases";
export const COPYRIGHT = "Copyright (c) 2026 zhufree";

export const defaultSettings: Settings = {
  dailyTargetMl: 2000,
  cupSizeMl: 250,
  cupStepMl: 50,
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
  seeds: [],
  produce: [],
  crops: [],
  collection: [],
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
  if (seedType === "cabbageSeed") {
    return locale === "zh-CN" ? "卷心菜" : "cabbage";
  }
  if (seedType === "peaSeed") {
    return locale === "zh-CN" ? "豌豆" : "pea";
  }
  if (seedType === "tomatoSeed") {
    return locale === "zh-CN" ? "西红柿" : "tomato";
  }
  if (seedType === "cornSeed") {
    return locale === "zh-CN" ? "玉米" : "corn";
  }
  if (seedType === "pumpkinSeed") {
    return locale === "zh-CN" ? "南瓜" : "pumpkin";
  }

  return locale === "zh-CN" ? "小青菜" : "bok choy";
}
