import type { Settings } from "./types";

export function formatMl(value: number) {
  return `${value.toLocaleString("zh-CN")} ml`;
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "未安排";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function computeReminderMeta(settings: Settings) {
  const activeMinutes = Math.max(
    60,
    (settings.activeEndHour - settings.activeStartHour) * 60
  );
  const drinksPerDay = Math.max(
    1,
    Math.ceil(settings.dailyTargetMl / Math.max(settings.cupSizeMl, 1))
  );
  const reminderIntervalMinutes = Math.max(15, Math.floor(activeMinutes / drinksPerDay));

  return {
    drinksPerDay,
    reminderIntervalMinutes
  };
}
