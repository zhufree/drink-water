export type Locale = "zh-CN" | "en-US";

export type Settings = {
  dailyTargetMl: number;
  cupSizeMl: number;
  cupStepMl: number;
  reminderIntervalMinutes: number;
  activeStartHour: number;
  activeEndHour: number;
  notificationsEnabled: boolean;
  autostartEnabled: boolean;
  locale: Locale;
};

export type TodayStatus = {
  targetMl: number;
  expectedMl: number;
  consumedMl: number;
  actualIntakeMl: number;
  debtMl: number;
  remainingMl: number;
  nextReminderAt: string | null;
  autostartEnabled: boolean;
  pendingReminder: boolean;
  pendingSince: string | null;
  completedReminderSlots: number;
  missedReminderSlots: number;
  canUndoLastDrink: boolean;
  lastLoggedAmountMl: number | null;
};

export type HistoryItem = {
  dayKey: string;
  targetMl: number;
  actualIntakeMl: number;
  consumedMl: number;
  debtIncurredMl: number;
  goalMet: boolean;
  completedReminderSlots: number;
  missedReminderSlots: number;
};

export type NotificationPermissionState =
  | "default"
  | "denied"
  | "granted"
  | "unsupported"
  | "prompt"
  | "prompt-with-rationale";
