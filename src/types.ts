export type Locale = "zh-CN" | "en-US";

export type Settings = {
  dailyTargetMl: number;
  cupSizeMl: number;
  cupStepMl: number;
  deviceId: string;
  displayName: string;
  activeCircleCode: string;
  activeCircleName: string;
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

export type CircleSummary = {
  circleCode: string;
  circleName: string | null;
};

export type LeaderboardEntry = {
  rank: number;
  deviceId: string;
  displayName: string;
  actualIntakeMl: number;
  targetMl: number;
  progressPercent: number;
};

export type AppUpdateInfo = {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseUrl: string;
  notes: string | null;
  publishedAt: string;
};
