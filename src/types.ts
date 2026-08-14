export type Locale = "zh-CN" | "en-US";

export type Settings = {
  dailyTargetMl: number;
  cupSizeMl: number;
  cupStepMl: number;
  panelOpacityPercent: number;
  panelBlurPx: number;
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

export type SettingsSnapshot = Pick<
  Settings,
  | "dailyTargetMl"
  | "cupSizeMl"
  | "cupStepMl"
  | "reminderIntervalMinutes"
  | "activeStartHour"
  | "activeEndHour"
  | "locale"
>;

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

export type AchievementId =
  | "first_sip"
  | "first_goal"
  | "first_reminder_answer"
  | "drink_streak_7"
  | "goal_streak_7"
  | "drink_streak_30"
  | "first_plant"
  | "first_harvest"
  | "harvest_10"
  | "same_crop_5"
  | "crop_varieties_3"
  | "first_background";

export type AchievementEvidence = {
  kind: "daily" | "streak" | "garden" | "collection" | "background";
  startDay?: string;
  endDay?: string;
  cropType?: string;
  value?: number;
};

export type AchievementReceipt = {
  achievementId: AchievementId;
  unlockedAt: string;
  evidence: AchievementEvidence;
};

export type AchievementState = {
  receipts: AchievementReceipt[];
};

export type AchievementSnapshotRecord = {
  receipts: AchievementReceipt[];
  updatedByDeviceId: string;
};

export type SeedInventoryItem = {
  seedType: string;
  count: number;
};

export type ProduceInventoryItem = {
  cropType: string;
  count: number;
};

export type PlantedCrop = {
  dayKey: string;
  seedType: string;
  plantedAt: string;
  harvestedAt?: string | null;
  boostAppliedSeconds: number;
};

export type GardenCollectionItem = {
  cropType: string;
  harvestCount: number;
  firstHarvestedAt?: string | null;
  lastHarvestedAt?: string | null;
};

export type GardenMaterialInventory = {
  wood: number;
  stone: number;
};

export type ExpeditionReward =
  | { kind: "material"; materialType: "wood" | "stone"; count: number }
  | { kind: "seed"; seedType: string; count: number };

export type ActiveExpedition = {
  expeditionId: string;
  dayKey: string;
  routeId: string;
  supplyCropType: string;
  startedAt: string;
  returnsAt: string;
  rewards: ExpeditionReward[];
};

export type WaterBabyState = {
  materials: GardenMaterialInventory;
  completedProjectIds: string[];
  lastExpeditionStartedDay: string | null;
  activeExpedition: ActiveExpedition | null;
};

export type GardenState = {
  initialGrantClaimed: boolean;
  initialGrantLastAwardedAt: string | null;
  produceMigrationClaimed: boolean;
  seeds: SeedInventoryItem[];
  produce: ProduceInventoryItem[];
  crops: PlantedCrop[];
  collection: GardenCollectionItem[];
  activeBackground: string;
  unlockedBackgrounds: string[];
  rest: RestState;
  waterBaby: WaterBabyState;
};

export type RestState = {
  active: boolean;
  startedAt: string | null;
  endsAt: string | null;
  cooldownEndsAt: string | null;
  maxDurationSeconds: number;
  plannedBoostSeconds: number;
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

export type LeaderboardCircleMeta = {
  ownerAccountId: string | null;
  memberCount: number;
};

export type LeaderboardEntry = {
  rank: number;
  accountId: string;
  displayName: string;
  actualIntakeMl: number;
  targetMl: number;
  progressPercent: number;
};

export type LeaderboardMemberGarden = {
  accountId: string;
  history: HistoryItem[];
  garden: GardenState | null;
  gardenUpdatedAt: string | null;
};

export type AppUpdateInfo = {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseUrl: string;
  notes: string | null;
  publishedAt: string;
};

export type SyncMeta = {
  accountId: string | null;
  pairingDeviceId: string;
  onboardingSeenAt: string | null;
  lastStartupCatchUpPromptDay: string | null;
  lastDailyPullAt: string | null;
  lastGardenPullAt: string | null;
  lastBackupAt: string | null;
  dailySnapshotUpdatedAtByDay: Record<string, string>;
  dailySnapshotUpdatedByDeviceIdByDay: Record<string, string>;
  gardenUpdatedAt: string | null;
  gardenUpdatedByDeviceId: string | null;
  settingsUpdatedAt: string | null;
  settingsUpdatedByDeviceId: string | null;
};

export type DailySnapshotRecord = {
  dayKey: string;
  snapshot: HistoryItem;
  updatedAt: string;
  updatedByDeviceId: string;
};

export type GardenSnapshotRecord = {
  snapshot: GardenState;
  updatedAt: string;
  updatedByDeviceId: string;
};

export type SettingsSnapshotRecord = {
  snapshot: SettingsSnapshot;
  updatedAt: string;
  updatedByDeviceId: string;
};

export type CloudBackupMeta = {
  objectKey: string;
  createdAt: string;
  deviceId: string;
  sizeBytes: number;
};
