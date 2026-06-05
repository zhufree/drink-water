import { useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  applyRemoteSnapshots,
  applyRemoteSettingsSnapshot,
  cancelRestBreak,
  completeRestBreak,
  exchangeProduce,
  exportCloudBackupPayload,
  exportData,
  getGardenSnapshot,
  getGardenState,
  getHistory,
  getRecentDailySnapshots,
  getSettings,
  getSettingsSnapshot,
  getSyncMeta,
  getTodayStatus,
  harvestCrop,
  importCloudBackupPayload,
  importData,
  logDrink,
  logYesterdayDrink,
  markCloudBackupUploaded,
  plantSeed,
  redeemBackgroundReward,
  saveSettings,
  setSyncAccount,
  startRestBreak,
  toggleAutostart,
  undoLastDrink
} from "../api";
import { createI18n } from "../i18n";
import {
  createLeaderboardCircle,
  disbandLeaderboardCircle,
  getLeaderboard,
  joinLeaderboardCircle,
  leaveLeaderboardCircle,
  removeLeaderboardMember
} from "../leaderboardApi";
import {
  bindPairCode,
  bootstrapSnapshotSync,
  createPairCode,
  pullDailySnapshots,
  pullGardenSnapshot,
  pullSettingsSnapshot,
  pushDailySnapshots,
  pushGardenSnapshot,
  pushSettingsSnapshot,
  restoreCloudBackup,
  uploadCloudBackup
} from "../syncApi";
import type {
  AppUpdateInfo,
  CircleSummary,
  HistoryItem,
  LeaderboardEntry,
  Locale,
  NotificationPermissionState,
  Settings,
  SettingsSnapshotRecord,
  SyncMeta,
  TodayStatus
} from "../types";
import { computeReminderMeta } from "../utils";
import {
  APP_VERSION,
  COPYRIGHT,
  RELEASE_URL,
  defaultGardenState,
  defaultSettings,
  getSeedDisplayName,
  type CirclesLoadState,
  type CloudIdentityState,
  type NicknameSaveState,
  type TabKey
} from "./appControllerConfig";
import {
  currentDayKey,
  extractErrorMessage,
  upsertCircle
} from "./appControllerUtils";
import { createCircleSyncApi } from "./appControllerCircles";
import { createAppUiActions } from "./appControllerUiActions";
import { useAppControllerEffects } from "./useAppControllerEffects";

const appWindow = getCurrentWindow();
const SYNC_STALE_THRESHOLD_MS = 45_000;
const SYNC_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const defaultSyncMeta: SyncMeta = {
  accountId: null,
  pairingDeviceId: "",
  lastStartupCatchUpPromptDay: null,
  lastDailyPullAt: null,
  lastGardenPullAt: null,
  lastBackupAt: null,
  dailySnapshotUpdatedAtByDay: {},
  dailySnapshotUpdatedByDeviceIdByDay: {},
  gardenUpdatedAt: null,
  gardenUpdatedByDeviceId: null
};

export { APP_VERSION, COPYRIGHT, RELEASE_URL };

export function useAppController() {
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [draftSettings, setDraftSettings] = useState<Settings>(defaultSettings);
  const [status, setStatus] = useState<TodayStatus | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [gardenState, setGardenState] = useState(defaultGardenState);
  const [syncMeta, setSyncMeta] = useState<SyncMeta>(defaultSyncMeta);
  const [quickAmount, setQuickAmount] = useState<number>(defaultSettings.cupSizeMl);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [notificationState, setNotificationState] =
    useState<NotificationPermissionState>("default");
  const [yesterdayCatchUpItem, setYesterdayCatchUpItem] = useState<HistoryItem | null>(null);
  const [yesterdayCatchUpAmount, setYesterdayCatchUpAmount] = useState(250);
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [circlesLoadState, setCirclesLoadState] = useState<CirclesLoadState>("loading");
  const [circleCodeInput, setCircleCodeInput] = useState("");
  const [circleNameInput, setCircleNameInput] = useState("");
  const [leaderboardMetric, setLeaderboardMetric] =
    useState<"intake" | "progress">("intake");
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [activeCircleOwnerAccountId, setActiveCircleOwnerAccountId] = useState<string | null>(null);
  const [activeCircleMemberCount, setActiveCircleMemberCount] = useState(0);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [cloudIdentityState, setCloudIdentityState] = useState<CloudIdentityState>("loading");
  const [cloudIdentityError, setCloudIdentityError] = useState<string | null>(null);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameSaveState, setNicknameSaveState] = useState<NicknameSaveState>("idle");
  const [nicknameSaveMessage, setNicknameSaveMessage] = useState<string | null>(null);
  const [restTick, setRestTick] = useState(() => Date.now());
  const [pairCode, setPairCode] = useState("");
  const [pairCodeInput, setPairCodeInput] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);

  const startupPromptCheckedRef = useRef(false);
  const lastSyncedStatsKeyRef = useRef("");
  const autoPullingSnapshotsRef = useRef(false);

  const locale: Locale = draftSettings.locale ?? settings.locale ?? "zh-CN";
  const i18n = useMemo(() => createI18n(locale), [locale]);
  const reminderMeta = useMemo(
    () => computeReminderMeta(draftSettings),
    [draftSettings]
  );
  const { syncCloudIdentity, applyCircleSnapshot, refreshCirclesFromServer } =
    createCircleSyncApi({
      settings,
      draftSettings,
      setSettings,
      setDraftSettings,
      setCircles,
      setCirclesLoadState
    });

  const refreshAll = async () => {
    const [nextSettings, nextStatus, nextHistory, nextGardenState, nextSyncMeta] = await Promise.all([
      getSettings(),
      getTodayStatus(),
      getHistory(56),
      getGardenState(),
      getSyncMeta()
    ]);

    setSettings(nextSettings);
    setDraftSettings(nextSettings);
    setQuickAmount((current) =>
      current === settings.cupSizeMl ? nextSettings.cupSizeMl : current
    );
    setStatus(nextStatus);
    setHistory(nextHistory);
    setGardenState(nextGardenState);
    setSyncMeta(nextSyncMeta);

    return { nextSettings, nextStatus, nextHistory, nextGardenState, nextSyncMeta };
  };

  const syncRecentSnapshots = async (input: { dayKeys?: string[]; garden?: boolean }) => {
    const meta = await getSyncMeta();
    setSyncMeta(meta);
    if (!settings.deviceId || !meta.accountId) {
      return;
    }

    if (input.dayKeys && input.dayKeys.length > 0) {
      const snapshots = await getRecentDailySnapshots(7);
      const wanted = new Set(input.dayKeys);
      const filtered = snapshots.filter((item) => wanted.has(item.dayKey));
      if (filtered.length > 0) {
        await pushDailySnapshots(meta.accountId, settings.deviceId, filtered);
      }
    }

    if (input.garden) {
      const snapshot = await getGardenSnapshot();
      await pushGardenSnapshot(meta.accountId, settings.deviceId, snapshot);
    }

    setSyncMeta(await getSyncMeta());
  };

  const pullRemoteSnapshotsToLocal = async (accountId: string, deviceId: string) => {
    const [dailyResult, gardenResult] = await Promise.all([
      pullDailySnapshots(accountId, deviceId),
      pullGardenSnapshot(accountId, deviceId)
    ]);

    await applyRemoteSnapshots(
      accountId,
      dailyResult.snapshots,
      gardenResult.snapshot,
      new Date().toISOString()
    );

    return refreshAll();
  };

  const shouldApplyRemoteSettingsSnapshot = (
    local: SettingsSnapshotRecord,
    remote: SettingsSnapshotRecord
  ) => {
    if (remote.updatedAt > local.updatedAt) {
      return true;
    }
    if (remote.updatedAt < local.updatedAt) {
      return false;
    }
    return remote.updatedByDeviceId > local.updatedByDeviceId;
  };

  const ensureSyncAccount = async (deviceId: string) => {
    const localMeta = await getSyncMeta();
    setSyncMeta(localMeta);
    const result = await bootstrapSnapshotSync(deviceId, localMeta.accountId);
    if (result.accountId !== localMeta.accountId) {
      const nextMeta = await setSyncAccount(result.accountId);
      setSyncMeta(nextMeta);
    }
    return result.accountId;
  };

  const maybeWarnSyncGap = (meta: SyncMeta) => {
    if (!meta.lastDailyPullAt) {
      return;
    }
    const gapMs = Date.now() - new Date(meta.lastDailyPullAt).getTime();
    if (gapMs > SYNC_RETENTION_MS) {
      setMessage(i18n.t("message.syncGapWarning"));
    }
  };

  const bootstrapAndPullSync = async (targetSettings: Settings) => {
    if (!targetSettings.deviceId) {
      return;
    }

    const meta = await getSyncMeta();
    setSyncMeta(meta);
    maybeWarnSyncGap(meta);
    const accountId = await ensureSyncAccount(targetSettings.deviceId);
    await pullRemoteSnapshotsToLocal(accountId, targetSettings.deviceId);
  };

  const pullSnapshotsForDevice = async (targetSettings: Settings) => {
    if (!targetSettings.deviceId) {
      return;
    }
    const accountId = await ensureSyncAccount(targetSettings.deviceId);
    await pullRemoteSnapshotsToLocal(accountId, targetSettings.deviceId);
  };

  const syncSettingsSnapshot = async (targetSettings: Settings) => {
    if (!targetSettings.deviceId) {
      return;
    }
    const accountId = await ensureSyncAccount(targetSettings.deviceId);
    const snapshot = await getSettingsSnapshot();
    await pushSettingsSnapshot(accountId, targetSettings.deviceId, snapshot);
    setSyncMeta(await getSyncMeta());
  };

  const prepareSyncBeforeWrite = async () => {
    const meta = await getSyncMeta();
    setSyncMeta(meta);
    if (!settings.deviceId || !meta.accountId) {
      return;
    }

    const latestPullAt = [meta.lastDailyPullAt, meta.lastGardenPullAt]
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .reduce((best, value) => Math.max(best, value), 0);

    if (!latestPullAt || Date.now() - latestPullAt > SYNC_STALE_THRESHOLD_MS) {
      await pullRemoteSnapshotsToLocal(meta.accountId, settings.deviceId);
    }
  };

  const syncAfterLocalWrite = (input: { dayKeys?: string[]; garden?: boolean }) => {
    void (async () => {
      try {
        await prepareSyncBeforeWrite();
        await syncRecentSnapshots(input);
      } catch (error) {
        console.error("background snapshot sync failed", error);
      }
    })();
  };

  const {
    handleWindowAction,
    handleSaveSettings,
    handleAutostartChange,
    handleExportData,
    handleImportData,
    handleDismissYesterdayCatchUp,
    handleConfirmYesterdayCatchUp,
    resetNicknameSaveFeedback
  } = createAppUiActions({
    draftSettings,
    settings,
    yesterdayCatchUpItem,
    yesterdayCatchUpAmount,
    i18n,
    refreshAll,
    syncCloudIdentity,
    applyCircleSnapshot,
    syncDailyDayKeys: async (dayKeys) => {
      await syncRecentSnapshots({ dayKeys });
    },
    syncSettingsSnapshot,
    setSettings,
    setDraftSettings,
    setQuickAmount,
    setStatus,
    setSaving,
    setMessage,
    setCloudIdentityState,
    setCloudIdentityError,
    setCirclesLoadState,
    setYesterdayCatchUpItem,
    setYesterdayCatchUpAmount,
    setNicknameSaveState,
    setNicknameSaveMessage
  });

  const handleLog = async (amountMl: number) => {
    setMessage("");
    await logDrink(amountMl);
    await refreshAll();
    syncAfterLocalWrite({ dayKeys: [currentDayKey()] });
    setMessage(i18n.t("message.logged", { amount: i18n.formatMl(amountMl) }));
  };

  const handleUndoLastDrink = async () => {
    setMessage("");
    const previousAmount = status?.lastLoggedAmountMl ?? null;
    await undoLastDrink();
    await refreshAll();
    syncAfterLocalWrite({ dayKeys: [currentDayKey()] });
    setMessage(
      i18n.t("message.undo", {
        amount: i18n.formatMl(previousAmount ?? 0)
      })
    );
  };

  const handlePlantSeed = async (dayKey: string, seedType: string) => {
    setMessage("");
    try {
      await plantSeed(dayKey, seedType);
      await refreshAll();
      syncAfterLocalWrite({ garden: true });
      setMessage(i18n.t("message.seedPlanted", { day: i18n.formatShortDay(dayKey) }));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    }
  };

  const handleHarvestCrop = async (dayKey: string) => {
    setMessage("");
    try {
      await harvestCrop(dayKey);
      await refreshAll();
      syncAfterLocalWrite({ garden: true });
      setMessage(i18n.t("message.cropHarvested", { day: i18n.formatShortDay(dayKey) }));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    }
  };

  const handleExchangeProduce = async (sourceCropType: string, targetSeedType: string, quantity = 1) => {
    setMessage("");
    try {
      await exchangeProduce(sourceCropType, targetSeedType, quantity);
      await refreshAll();
      syncAfterLocalWrite({ garden: true });
      setMessage(
        i18n.t("message.exchangeSuccess", {
          count: quantity,
          seed: getSeedDisplayName(targetSeedType, locale)
        })
      );
    } catch (error) {
      setMessage(extractErrorMessage(error));
    }
  };

  const handleRedeemBackgroundReward = async (rewardId: string) => {
    setMessage("");
    try {
      await redeemBackgroundReward(rewardId);
      await refreshAll();
      syncAfterLocalWrite({ garden: true });
      setMessage(i18n.t("message.backgroundSynced"));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    }
  };

  const handlePreviewBackgroundChange = (backgroundId: string) => {
    setGardenState((current) => ({
      ...current,
      activeBackground: backgroundId
    }));
    setMessage("");
  };

  const handleStartRestBreak = async () => {
    setMessage("");
    try {
      await startRestBreak();
      await refreshAll();
      setRestTick(Date.now());
      syncAfterLocalWrite({ garden: true });
      setMessage(i18n.t("message.restStarted"));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    }
  };

  const handleCancelRestBreak = async () => {
    setMessage("");
    try {
      await cancelRestBreak();
      await refreshAll();
      syncAfterLocalWrite({ garden: true });
      setMessage(i18n.t("message.restCancelled"));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    }
  };

  const handleCompleteRestBreak = async () => {
    try {
      await completeRestBreak();
      await refreshAll();
      syncAfterLocalWrite({ garden: true });
      setMessage(i18n.t("message.restCompleted"));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    }
  };

  const handleCreateCircle = async () => {
    if (!settings.deviceId) {
      return;
    }

    try {
      const result = await createLeaderboardCircle(settings.deviceId, circleNameInput.trim());
      const nextCircles = upsertCircle(circles, {
        circleCode: result.circleCode,
        circleName: result.circleName
      });
      let nextSettings = await saveSettings({
        ...settings,
        activeCircleCode: result.circleCode,
        activeCircleName: result.circleName ?? ""
      });
      setSettings(nextSettings);
      setDraftSettings(nextSettings);
      setCircleNameInput("");
      nextSettings = await applyCircleSnapshot(nextSettings, nextCircles);
      void refreshCirclesFromServer(settings.deviceId);
      setActiveTab("leaderboard");
      setMessage(i18n.t("message.circleCreated", { code: result.circleCode }));
    } catch (error) {
      setCirclesLoadState("error");
      setMessage(extractErrorMessage(error));
    }
  };

  const handleJoinCircle = async () => {
    if (!settings.deviceId) {
      return;
    }

    try {
      const result = await joinLeaderboardCircle(settings.deviceId, circleCodeInput.trim());
      const nextCircles = upsertCircle(circles, {
        circleCode: result.circleCode,
        circleName: result.circleName
      });
      let nextSettings = await saveSettings({
        ...settings,
        activeCircleCode: result.circleCode,
        activeCircleName: result.circleName ?? ""
      });
      setSettings(nextSettings);
      setDraftSettings(nextSettings);
      setCircleCodeInput("");
      nextSettings = await applyCircleSnapshot(nextSettings, nextCircles);
      void refreshCirclesFromServer(settings.deviceId);
      setActiveTab("leaderboard");
      setMessage(i18n.t("message.circleJoined", { code: result.circleCode }));
    } catch (error) {
      setCirclesLoadState("error");
      setMessage(extractErrorMessage(error));
    }
  };

  const handleReconnectLeaderboard = async () => {
    if (!settings.deviceId) {
      return;
    }

    setMessage("");
    setCloudIdentityState("loading");
    setCloudIdentityError(null);
    setCirclesLoadState("loading");

    try {
      const bootstrapResult = await syncCloudIdentity(settings);
      await applyCircleSnapshot(settings, bootstrapResult.circles);
      setCloudIdentityState("ready");
      setMessage(i18n.t("leaderboard.identityReconnectSuccess"));
    } catch (error) {
      setCloudIdentityState("error");
      setCloudIdentityError(extractErrorMessage(error));
      setCirclesLoadState("error");
      setMessage(extractErrorMessage(error));
    }
  };

  const handleSaveDisplayName = async () => {
    if (nicknameSaving) {
      return;
    }

    setNicknameSaving(true);
    setNicknameSaveState("idle");
    setNicknameSaveMessage(null);

    try {
      const saved = await saveSettings({
        ...settings,
        displayName: draftSettings.displayName
      });
      setSettings(saved);
      setDraftSettings((current) => ({ ...current, displayName: saved.displayName }));
      setCloudIdentityState("loading");
      setCloudIdentityError(null);

      try {
        const bootstrapResult = await syncCloudIdentity(saved);
        await applyCircleSnapshot(saved, bootstrapResult.circles);
        setCloudIdentityState("ready");
      } catch (error) {
        setCloudIdentityState("error");
        setCloudIdentityError(extractErrorMessage(error));
        throw error;
      }

      if (saved.activeCircleCode) {
        await refreshLeaderboard();
      }

      setNicknameSaveState("success");
      setNicknameSaveMessage(i18n.t("leaderboard.displayNameSaved"));
    } catch (error) {
      setNicknameSaveState("error");
      setNicknameSaveMessage(
        `${i18n.t("leaderboard.displayNameSaveFailed")} ${extractErrorMessage(error)}`
      );
    } finally {
      setNicknameSaving(false);
    }
  };

  const handleSelectCircle = async (circle: CircleSummary) => {
    const nextSettings = await saveSettings({
      ...settings,
      activeCircleCode: circle.circleCode,
      activeCircleName: circle.circleName ?? ""
    });
    setSettings(nextSettings);
    setDraftSettings(nextSettings);
    setMessage(i18n.t("message.circleSelected", { code: circle.circleCode }));
  };

  const refreshLeaderboard = async () => {
    if (!settings.activeCircleCode) {
      setLeaderboardEntries([]);
      setActiveCircleOwnerAccountId(null);
      setActiveCircleMemberCount(0);
      return;
    }

    setLeaderboardLoading(true);
    try {
      const result = await getLeaderboard({
        circleCode: settings.activeCircleCode,
        dayKey: currentDayKey(),
        metric: leaderboardMetric
      });
      setActiveCircleOwnerAccountId(result.ownerAccountId);
      setActiveCircleMemberCount(result.memberCount);
      setLeaderboardEntries(result.leaderboard);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const handleRemoveCircleMember = async (targetAccountId: string, displayName: string) => {
    if (!settings.deviceId || !settings.activeCircleCode) {
      return;
    }

    try {
      await removeLeaderboardMember({
        deviceId: settings.deviceId,
        circleCode: settings.activeCircleCode,
        targetAccountId
      });
      await refreshLeaderboard();
      await refreshCirclesFromServer(settings.deviceId);
      setMessage(locale === "zh-CN" ? "成员已移出圈子。" : "Member removed from the circle.");
    } catch (error) {
      setMessage(extractErrorMessage(error));
    }
  };

  const handleLeaveCurrentCircle = async () => {
    if (!settings.deviceId || !settings.activeCircleCode) {
      return;
    }

    try {
      await leaveLeaderboardCircle({
        deviceId: settings.deviceId,
        circleCode: settings.activeCircleCode
      });
      await refreshCirclesFromServer(settings.deviceId);
      setMessage(locale === "zh-CN" ? "已退出当前圈子。" : "Left the current circle.");
    } catch (error) {
      setMessage(extractErrorMessage(error));
    }
  };

  const handleDisbandCurrentCircle = async () => {
    if (!settings.deviceId || !settings.activeCircleCode) {
      return;
    }

    try {
      await disbandLeaderboardCircle({
        deviceId: settings.deviceId,
        circleCode: settings.activeCircleCode
      });
      await refreshCirclesFromServer(settings.deviceId);
      setMessage(locale === "zh-CN" ? "当前圈子已解散。" : "The current circle has been disbanded.");
    } catch (error) {
      setMessage(extractErrorMessage(error));
    }
  };

  const handleCreatePairCode = async () => {
    if (!settings.deviceId) {
      return;
    }

    setSyncBusy(true);
    setMessage("");
    try {
      const accountId = await ensureSyncAccount(settings.deviceId);
      const result = await createPairCode(accountId, settings.deviceId);
      setPairCode(result.pairCode);
      setMessage(i18n.t("message.pairCodeCreated", { code: result.pairCode }));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    } finally {
      setSyncBusy(false);
    }
  };

  const handleBindPairCode = async () => {
    if (!settings.deviceId || !pairCodeInput.trim()) {
      return;
    }

    setSyncBusy(true);
    setMessage("");
    try {
      const result = await bindPairCode(settings.deviceId, pairCodeInput.trim());
      const nextMeta = await setSyncAccount(result.accountId);
      setSyncMeta(nextMeta);
      await pullRemoteSnapshotsToLocal(result.accountId, settings.deviceId);
      setPairCodeInput("");
      setMessage(i18n.t("message.deviceBound"));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    } finally {
      setSyncBusy(false);
    }
  };

  const handlePullSyncNow = async () => {
    if (!settings.deviceId) {
      return;
    }

    setSyncBusy(true);
    setMessage("");
    try {
      await pullSnapshotsForDevice(settings);
      setMessage(i18n.t("message.snapshotsPulled"));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    } finally {
      setSyncBusy(false);
    }
  };

  const handlePullSettingsNow = async () => {
    if (!settings.deviceId) {
      return;
    }

    setSyncBusy(true);
    setMessage("");
    try {
      const accountId = await ensureSyncAccount(settings.deviceId);
      const localSnapshot = await getSettingsSnapshot();
      const remoteResult = await pullSettingsSnapshot(accountId, settings.deviceId);

      if (
        remoteResult.snapshot &&
        shouldApplyRemoteSettingsSnapshot(localSnapshot, remoteResult.snapshot)
      ) {
        await applyRemoteSettingsSnapshot(remoteResult.snapshot, new Date().toISOString());
        await refreshAll();
      } else {
        await pushSettingsSnapshot(accountId, settings.deviceId, localSnapshot);
        setSyncMeta(await getSyncMeta());
      }

      setMessage(locale === "zh-CN" ? "设置已同步。" : "Settings synced.");
    } catch (error) {
      setMessage(extractErrorMessage(error));
    } finally {
      setSyncBusy(false);
    }
  };

  const handleRefreshSnapshotsNow = async () => {
    if (!settings.deviceId) {
      return;
    }

    setSyncBusy(true);
    setMessage("");
    try {
      await pullSnapshotsForDevice(settings);
      setMessage(i18n.t("message.snapshotsPulled"));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    } finally {
      setSyncBusy(false);
    }
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if ((tab !== "today" && tab !== "history") || tab === activeTab) {
      return;
    }

    void (async () => {
      if (autoPullingSnapshotsRef.current) {
        return;
      }
      autoPullingSnapshotsRef.current = true;
      try {
        await pullSnapshotsForDevice(settings);
      } catch (error) {
        console.error("auto snapshot pull failed", error);
      } finally {
        autoPullingSnapshotsRef.current = false;
      }
    })();
  };

  const handleUploadCloudBackup = async () => {
    if (!settings.deviceId) {
      return;
    }

    setSyncBusy(true);
    setMessage("");
    try {
      const accountId = await ensureSyncAccount(settings.deviceId);
      const payload = await exportCloudBackupPayload();
      const result = await uploadCloudBackup(accountId, settings.deviceId, payload);
      const nextMeta = await markCloudBackupUploaded(result.backup.createdAt);
      setSyncMeta(nextMeta);
      setMessage(i18n.t("message.cloudBackupUploaded"));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    } finally {
      setSyncBusy(false);
    }
  };

  const handleRestoreCloudBackup = async () => {
    if (!settings.deviceId) {
      return;
    }

    setSyncBusy(true);
    setMessage("");
    try {
      const accountId = await ensureSyncAccount(settings.deviceId);
      const result = await restoreCloudBackup(accountId, settings.deviceId);
      await importCloudBackupPayload(result.content);
      await refreshAll();
      setMessage(i18n.t("message.cloudBackupRestored"));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    } finally {
      setSyncBusy(false);
    }
  };

  const restRemainingSeconds = gardenState.rest.endsAt
    ? Math.max(
        0,
        Math.ceil((new Date(gardenState.rest.endsAt).getTime() - restTick) / 1000)
      )
    : 0;

  const restCooldownRemainingSeconds = gardenState.rest.cooldownEndsAt
    ? Math.max(
        0,
        Math.ceil((new Date(gardenState.rest.cooldownEndsAt).getTime() - Date.now()) / 1000)
      )
    : 0;

  useAppControllerEffects({
    refreshAll,
    settings,
    draftSettings,
    status,
    message,
    leaderboardMetric,
    gardenRestActive: gardenState.rest.active,
    gardenRestEndsAt: gardenState.rest.endsAt,
    restTick,
    startupPromptCheckedRef,
    lastSyncedStatsKeyRef,
    setLoading,
    setNotificationState,
    setCloudIdentityState,
    setCloudIdentityError,
    setCirclesLoadState,
    setUpdateInfo,
    setYesterdayCatchUpItem,
    setYesterdayCatchUpAmount,
    setSyncMeta,
    setMessage,
    setLeaderboardEntries,
    setRestTick,
    syncCloudIdentity,
    applyCircleSnapshot,
    refreshLeaderboard,
    handleCompleteRestBreak,
    bootstrapSnapshotSync: bootstrapAndPullSync
  });

  return {
    activeTab,
    settings,
    draftSettings,
    status,
    history,
    gardenState,
    syncMeta,
    pairCode,
    pairCodeInput,
    syncBusy,
    quickAmount,
    loading,
    saving,
    message,
    notificationState,
    yesterdayCatchUpItem,
    yesterdayCatchUpAmount,
    circles,
    circlesLoadState,
    circleCodeInput,
    circleNameInput,
    leaderboardMetric,
    leaderboardEntries,
    leaderboardLoading,
    activeCircleOwnerAccountId,
    activeCircleMemberCount,
    updateInfo,
    cloudIdentityState,
    cloudIdentityError,
    nicknameSaving,
    nicknameSaveState,
    nicknameSaveMessage,
    locale,
    i18n,
    reminderMeta,
    restRemainingSeconds,
    restCooldownRemainingSeconds,
    setActiveTab,
    handleTabChange,
    setDraftSettings,
    setQuickAmount,
    setYesterdayCatchUpAmount,
    setCircleCodeInput,
    setCircleNameInput,
    setPairCodeInput,
    setLeaderboardMetric,
    handleLog,
    handleUndoLastDrink,
    handleWindowAction,
    handleSaveSettings,
    handleAutostartChange,
    handleExportData,
    handleImportData,
    handleDismissYesterdayCatchUp,
    handleConfirmYesterdayCatchUp,
    handlePlantSeed,
    handleHarvestCrop,
    handleExchangeProduce,
    handleRedeemBackgroundReward,
    handlePreviewBackgroundChange,
    handleStartRestBreak,
    handleCancelRestBreak,
    handleCreateCircle,
    handleJoinCircle,
    handleReconnectLeaderboard,
    handleSaveDisplayName,
    handleSelectCircle,
    handleRemoveCircleMember,
    handleLeaveCurrentCircle,
    handleDisbandCurrentCircle,
    handleCreatePairCode,
    handleBindPairCode,
    handlePullSyncNow,
    handlePullSettingsNow,
    handleRefreshSnapshotsNow,
    handleUploadCloudBackup,
    handleRestoreCloudBackup,
    resetNicknameSaveFeedback,
    refreshLeaderboard,
    appWindow
  };
}
