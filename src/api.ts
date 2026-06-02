import { invoke } from "@tauri-apps/api/core";
import type { GardenState, HistoryItem, Settings, TodayStatus } from "./types";

export const getSettings = () => invoke<Settings>("get_settings");

export const saveSettings = (settings: Settings) =>
  invoke<Settings>("save_settings", { settings });

export const getTodayStatus = () => invoke<TodayStatus>("get_today_status");

export const logDrink = (amountMl: number) =>
  invoke<TodayStatus>("log_drink", { amountMl });

export const undoLastDrink = () => invoke<TodayStatus>("undo_last_drink");

export const toggleAutostart = (enabled: boolean) =>
  invoke<boolean>("toggle_autostart", { enabled });

export const getHistory = (range: number) =>
  invoke<HistoryItem[]>("get_history", { range });

export const getGardenState = () => invoke<GardenState>("get_garden_state");

export const plantSeed = (dayKey: string, seedType: string) =>
  invoke<GardenState>("plant_seed", { dayKey, seedType });

export const harvestCrop = (dayKey: string) =>
  invoke<GardenState>("harvest_crop", { dayKey });

export const exchangeProduce = (sourceCropType: string, targetSeedType: string) =>
  invoke<GardenState>("exchange_produce", { sourceCropType, targetSeedType });

export const startRestBreak = () =>
  invoke<GardenState>("start_rest_break");

export const cancelRestBreak = () =>
  invoke<GardenState>("cancel_rest_break");

export const completeRestBreak = () =>
  invoke<GardenState>("complete_rest_break");

export const exportData = () => invoke<boolean>("export_data");

export const importData = () => invoke<boolean>("import_data");

export const logYesterdayDrink = (amountMl: number) =>
  invoke<boolean>("log_yesterday_drink", { amountMl });
