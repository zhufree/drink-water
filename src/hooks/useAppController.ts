import { useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  cancelRestBreak,
  completeRestBreak,
  exchangeProduce,
  exportData,
  getGardenState,
  getHistory,
  getSettings,
  getTodayStatus,
  harvestCrop,
  importData,
  logYesterdayDrink,
  logDrink,
  plantSeed,
  redeemBackgroundReward,
  saveSettings,
  startRestBreak,
  toggleAutostart,
  undoLastDrink
} from "../api";
import { createI18n } from "../i18n";
import {
  createLeaderboardCircle,
  getLeaderboard,
  joinLeaderboardCircle
} from "../leaderboardApi";
import type {
  AppUpdateInfo,
  CircleSummary,
  HistoryItem,
  LeaderboardEntry,
  Locale,
  NotificationPermissionState,
  Settings,
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

export { APP_VERSION, COPYRIGHT, RELEASE_URL };

export function useAppController() {
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [draftSettings, setDraftSettings] = useState<Settings>(defaultSettings);
  const [status, setStatus] = useState<TodayStatus | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [gardenState, setGardenState] = useState(defaultGardenState);
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
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [cloudIdentityState, setCloudIdentityState] = useState<CloudIdentityState>("loading");
  const [cloudIdentityError, setCloudIdentityError] = useState<string | null>(null);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameSaveState, setNicknameSaveState] = useState<NicknameSaveState>("idle");
  const [nicknameSaveMessage, setNicknameSaveMessage] = useState<string | null>(null);
  const [restTick, setRestTick] = useState(() => Date.now());

  const startupPromptCheckedRef = useRef(false);
  const lastSyncedStatsKeyRef = useRef("");

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
    const [nextSettings, nextStatus, nextHistory, nextGardenState] = await Promise.all([
      getSettings(),
      getTodayStatus(),
      getHistory(56),
      getGardenState()
    ]);

    setSettings(nextSettings);
    setDraftSettings(nextSettings);
    setQuickAmount((current) =>
      current === settings.cupSizeMl ? nextSettings.cupSizeMl : current
    );
    setStatus(nextStatus);
    setHistory(nextHistory);
    setGardenState(nextGardenState);

    return { nextSettings, nextStatus, nextHistory, nextGardenState };
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
    const nextStatus = await logDrink(amountMl);
    setStatus(nextStatus);
    setHistory(await getHistory(56));
    setGardenState(await getGardenState());
    setMessage(i18n.t("message.logged", { amount: i18n.formatMl(amountMl) }));
  };

  const handleUndoLastDrink = async () => {
    setMessage("");
    const previousAmount = status?.lastLoggedAmountMl ?? null;
    const nextStatus = await undoLastDrink();
    setStatus(nextStatus);
    setHistory(await getHistory(56));
    setGardenState(await getGardenState());
    setMessage(
      i18n.t("message.undo", {
        amount: i18n.formatMl(previousAmount ?? 0)
      })
    );
  };

  const handlePlantSeed = async (dayKey: string, seedType: string) => {
    setMessage("");
    try {
      const nextGardenState = await plantSeed(dayKey, seedType);
      setGardenState(nextGardenState);
      setMessage(i18n.t("message.seedPlanted", { day: i18n.formatShortDay(dayKey) }));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    }
  };

  const handleHarvestCrop = async (dayKey: string) => {
    setMessage("");
    try {
      const nextGardenState = await harvestCrop(dayKey);
      setGardenState(nextGardenState);
      setMessage(i18n.t("message.cropHarvested", { day: i18n.formatShortDay(dayKey) }));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    }
  };

  const handleExchangeProduce = async (sourceCropType: string, targetSeedType: string) => {
    setMessage("");
    try {
      const nextGardenState = await exchangeProduce(sourceCropType, targetSeedType);
      setGardenState(nextGardenState);
      setMessage(
        i18n.t("message.exchangeSuccess", {
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
      const nextGardenState = await redeemBackgroundReward(rewardId);
      setGardenState(nextGardenState);
      setMessage(
        locale === "zh-CN"
          ? "已兑换猫猫背景，并自动应用。"
          : "Unlocked the cat collage background and applied it."
      );
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
      const nextGardenState = await startRestBreak();
      setGardenState(nextGardenState);
      setRestTick(Date.now());
      setMessage(i18n.t("message.restStarted"));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    }
  };

  const handleCancelRestBreak = async () => {
    setMessage("");
    try {
      const nextGardenState = await cancelRestBreak();
      setGardenState(nextGardenState);
      setMessage(i18n.t("message.restCancelled"));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    }
  };

  const handleCompleteRestBreak = async () => {
    try {
      const nextGardenState = await completeRestBreak();
      setGardenState(nextGardenState);
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
      return;
    }

    setLeaderboardLoading(true);
    try {
      const result = await getLeaderboard({
        circleCode: settings.activeCircleCode,
        dayKey: currentDayKey(),
        metric: leaderboardMetric
      });
      setLeaderboardEntries(result.leaderboard);
    } finally {
      setLeaderboardLoading(false);
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
    setMessage,
    setLeaderboardEntries,
    setRestTick,
    syncCloudIdentity,
    applyCircleSnapshot,
    refreshLeaderboard,
    handleCompleteRestBreak
  });

  return {
    activeTab,
    settings,
    draftSettings,
    status,
    history,
    gardenState,
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
    setDraftSettings,
    setQuickAmount,
    setYesterdayCatchUpAmount,
    setCircleCodeInput,
    setCircleNameInput,
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
    resetNicknameSaveFeedback,
    refreshLeaderboard,
    appWindow
  };

}
