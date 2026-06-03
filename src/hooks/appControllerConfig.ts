import type { GardenState, Locale, Settings } from "../types";

export type TabKey = "today" | "history" | "leaderboard" | "settings";
export type CirclesLoadState = "loading" | "ready" | "error";
export type CloudIdentityState = "loading" | "ready" | "error";
export type NicknameSaveState = "idle" | "success" | "error";

export const APP_VERSION = "0.5.7";
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
  if (seedType === "potatoSeed") {
    return locale === "zh-CN" ? "土豆" : "potato";
  }
  if (seedType === "bellPepperSeed") {
    return locale === "zh-CN" ? "青椒" : "bell pepper";
  }
  if (seedType === "carrotSeed") {
    return locale === "zh-CN" ? "胡萝卜" : "carrot";
  }
  if (seedType === "napaCabbageSeed") {
    return locale === "zh-CN" ? "大白菜" : "napa cabbage";
  }
  if (seedType === "broccoliSeed") {
    return locale === "zh-CN" ? "西兰花" : "broccoli";
  }
  if (seedType === "radishSeed") {
    return locale === "zh-CN" ? "萝卜" : "radish";
  }
  if (seedType === "onionSeed") {
    return locale === "zh-CN" ? "洋葱" : "onion";
  }
  if (seedType === "eggplantSeed") {
    return locale === "zh-CN" ? "茄子" : "eggplant";
  }
  if (seedType === "cabbageSeed") {
    return locale === "zh-CN" ? "青椒" : "bell pepper";
  }
  if (seedType === "gardenPeaSeed") {
    return locale === "zh-CN" ? "豌豆" : "pea";
  }
  if (seedType === "tomatoSeed") {
    return locale === "zh-CN" ? "西兰花" : "broccoli";
  }
  if (seedType === "cornSeed") {
    return locale === "zh-CN" ? "萝卜" : "radish";
  }
  if (seedType === "pumpkinSeed") {
    return locale === "zh-CN" ? "南瓜" : "pumpkin";
  }

  return locale === "zh-CN" ? "土豆" : "potato";
}
