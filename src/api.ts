import { invoke } from "@tauri-apps/api/core";
import type { HistoryItem, Settings, TodayStatus } from "./types";

export const getSettings = () => invoke<Settings>("get_settings");

export const saveSettings = (settings: Settings) =>
  invoke<Settings>("save_settings", { settings });

export const getTodayStatus = () => invoke<TodayStatus>("get_today_status");

export const logDrink = (amountMl: number) =>
  invoke<TodayStatus>("log_drink", { amountMl });

export const toggleAutostart = (enabled: boolean) =>
  invoke<boolean>("toggle_autostart", { enabled });

export const dismissOrSnoozeReminder = () =>
  invoke<TodayStatus>("dismiss_or_snooze_reminder");

export const getHistory = (range: number) =>
  invoke<HistoryItem[]>("get_history", { range });
