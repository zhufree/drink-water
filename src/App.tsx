import { useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  isPermissionGranted,
  requestPermission
} from "@tauri-apps/plugin-notification";
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
  saveSettings,
  startRestBreak,
  toggleAutostart,
  undoLastDrink
} from "./api";
import { HistoryPanel } from "./components/HistoryPanel";
import { LeaderboardPanel } from "./components/LeaderboardPanel";
import { PrimaryTabs } from "./components/PrimaryTabs";
import { SettingsPanel } from "./components/SettingsPanel";
import { StartupCatchUpModal } from "./components/StartupCatchUpModal";
import { TodayPanel } from "./components/TodayPanel";
import { WindowChrome } from "./components/WindowChrome";
import { I18nProvider, createI18n } from "./i18n";
import {
  bootstrapLeaderboard,
  checkForAppUpdate,
  createLeaderboardCircle,
  getLeaderboard,
  joinLeaderboardCircle,
  listLeaderboardCircles,
  updateLeaderboardProfile,
  upsertLeaderboardStats
} from "./leaderboardApi";
import type {
  AppUpdateInfo,
  CircleSummary,
  GardenState,
  HistoryItem,
  LeaderboardEntry,
  Locale,
  NotificationPermissionState,
  Settings,
  TodayStatus
} from "./types";
import { computeReminderMeta } from "./utils";

type TabKey = "today" | "history" | "leaderboard" | "settings";
type CirclesLoadState = "loading" | "ready" | "error";
type CloudIdentityState = "loading" | "ready" | "error";
type NicknameSaveState = "idle" | "success" | "error";

const APP_VERSION = "0.5.0";
const RELEASE_URL = "https://github.com/zhufree/drink-water/releases";
const COPYRIGHT = "Copyright (c) 2026 zhufree";

const appWindow = getCurrentWindow();

const defaultSettings: Settings = {
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

const defaultGardenState: GardenState = {
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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [draftSettings, setDraftSettings] = useState<Settings>(defaultSettings);
  const [status, setStatus] = useState<TodayStatus | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [gardenState, setGardenState] = useState<GardenState>(defaultGardenState);
  const [quickAmount, setQuickAmount] = useState<number>(defaultSettings.cupSizeMl);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [notificationState, setNotificationState] =
    useState<NotificationPermissionState>("default");
  const [yesterdayCatchUpItem, setYesterdayCatchUpItem] =
    useState<HistoryItem | null>(null);
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

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    const bootstrap = async () => {
      try {
        const granted = await isPermissionGranted();
        if (granted) {
          setNotificationState("granted");
        } else {
          const result = await requestPermission();
          setNotificationState(result);
        }
      } catch {
        setNotificationState("unsupported");
      }

      try {
        let { nextSettings, nextHistory } = await refreshAll();

        if (!nextSettings.deviceId) {
          const saved = await saveSettings({
            ...nextSettings,
            deviceId: crypto.randomUUID()
          });
          setSettings(saved);
          setDraftSettings(saved);
          nextSettings = saved;
        }

        setCloudIdentityState("loading");
        setCloudIdentityError(null);
        try {
          const bootstrapResult = await syncCloudIdentity(nextSettings);
          nextSettings = await applyCircleSnapshot(nextSettings, bootstrapResult.circles);
          setCloudIdentityState("ready");
        } catch (error) {
          setCloudIdentityState("error");
          setCloudIdentityError(extractErrorMessage(error));
          setCirclesLoadState("error");
        }
        try {
          const nextUpdateInfo = await checkForAppUpdate({
            appId: "drink-water",
            platform: "desktop-windows",
            currentVersion: APP_VERSION
          });
          setUpdateInfo(nextUpdateInfo);
        } catch {
          setUpdateInfo(null);
        }

        if (!startupPromptCheckedRef.current) {
          startupPromptCheckedRef.current = true;
          const yesterdayCandidate = findYesterdayCatchUpCandidate(nextHistory);
          if (yesterdayCandidate) {
            setYesterdayCatchUpItem(yesterdayCandidate);
            setYesterdayCatchUpAmount(250);
          }
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }

      unlisten = await listen("state-updated", async () => {
        if (!disposed) {
          await refreshAll();
        }
      });
    };

    void bootstrap();

    const timer = window.setInterval(() => {
      void refreshAll();
    }, 30000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      if (unlisten) {
        void unlisten();
      }
    };
  }, []);

  useEffect(() => {
    if (!settings.deviceId || !settings.activeCircleCode || !status) {
      return;
    }

    const syncKey = [
      settings.deviceId,
      settings.activeCircleCode,
      currentDayKey(),
      status.actualIntakeMl,
      status.targetMl
    ].join("|");

    if (lastSyncedStatsKeyRef.current === syncKey) {
      return;
    }

    lastSyncedStatsKeyRef.current = syncKey;

    void upsertLeaderboardStats({
      deviceId: settings.deviceId,
      circleCode: settings.activeCircleCode,
      dayKey: currentDayKey(),
      actualIntakeMl: status.actualIntakeMl,
      targetMl: status.targetMl
    }).catch(() => {
      lastSyncedStatsKeyRef.current = "";
    });
  }, [settings.deviceId, settings.activeCircleCode, status]);

  useEffect(() => {
    if (!settings.activeCircleCode) {
      setLeaderboardEntries([]);
      return;
    }

    void refreshLeaderboard();
  }, [settings.activeCircleCode, leaderboardMetric]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!gardenState.rest.active) {
      return;
    }

    const timer = window.setInterval(() => {
      setRestTick(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [gardenState.rest.active]);

  useEffect(() => {
    if (!gardenState.rest.active || !gardenState.rest.endsAt) {
      return;
    }

    const remainingMs = new Date(gardenState.rest.endsAt).getTime() - restTick;
    if (remainingMs > 0) {
      return;
    }

    void handleCompleteRestBreak();
  }, [gardenState.rest.active, gardenState.rest.endsAt, restTick]);

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

  const handleWindowAction = async (
    actionName: "minimize" | "hide",
    action: () => Promise<void>
  ) => {
    try {
      await action();
    } catch (error) {
      const detail =
        error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      setMessage(
        i18n.t("message.windowActionFailed", {
          action:
            actionName === "minimize"
              ? i18n.t("window.minimize")
              : i18n.t("window.hideToTray"),
          detail
        })
      );
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage("");

    try {
      const saved = await saveSettings(draftSettings);
      setSettings(saved);
      setDraftSettings(saved);
      setQuickAmount(saved.cupSizeMl);
      setStatus(await getTodayStatus());
      setCloudIdentityState("loading");
      setCloudIdentityError(null);
      try {
        const bootstrapResult = await syncCloudIdentity(saved);
        await applyCircleSnapshot(saved, bootstrapResult.circles);
        setCloudIdentityState("ready");
      } catch (error) {
        setCloudIdentityState("error");
        setCloudIdentityError(extractErrorMessage(error));
        setCirclesLoadState("error");
      }
      setMessage(i18n.t("message.settingsSaved"));
    } finally {
      setSaving(false);
    }
  };

  const handleAutostartChange = async (enabled: boolean) => {
    const applied = await toggleAutostart(enabled);
    const next = { ...draftSettings, autostartEnabled: applied };
    setDraftSettings(next);
    setSettings((current) => ({ ...current, autostartEnabled: applied }));
    setStatus(await getTodayStatus());
  };

  const handleExportData = async () => {
    setMessage("");
    const exported = await exportData();
    if (exported) {
      setMessage(i18n.t("message.exportSuccess"));
    }
  };

  const handleImportData = async () => {
    setMessage("");
    const imported = await importData();
    if (!imported) {
      return;
    }

    await refreshAll();
    setMessage(i18n.t("message.importSuccess"));
  };

  const handleDismissYesterdayCatchUp = () => {
    setYesterdayCatchUpItem(null);
    setYesterdayCatchUpAmount(250);
  };

  const handleConfirmYesterdayCatchUp = async () => {
    if (!yesterdayCatchUpItem) {
      return;
    }

    const amount = yesterdayCatchUpAmount;
    setMessage("");
    await logYesterdayDrink(amount);
    handleDismissYesterdayCatchUp();
    await refreshAll();
    setMessage(
      i18n.t("message.yesterdayCatchUpSaved", {
        amount: i18n.formatMl(amount)
      })
    );
  };

  const handlePlantSeed = async (dayKey: string) => {
    setMessage("");
    try {
      const nextGardenState = await plantSeed(dayKey, "bokChoy");
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

  const handleExchangeProduce = async (ruleId: string) => {
    setMessage("");
    try {
      const nextGardenState = await exchangeProduce(ruleId);
      setGardenState(nextGardenState);
      setMessage(i18n.t("message.exchangeSuccess"));
    } catch (error) {
      setMessage(extractErrorMessage(error));
    }
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
      setMessage(
        i18n.t("message.circleCreated", {
          code: result.circleCode
        })
      );
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
      setMessage(
        i18n.t("message.circleJoined", {
          code: result.circleCode
        })
      );
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
    setMessage(
      i18n.t("message.circleSelected", {
        code: circle.circleCode
      })
    );
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

  return (
    <I18nProvider locale={locale}>
      {loading || !status ? (
        <main className="grid h-screen place-items-center px-[14px] py-[12px] text-slate-200/80">
          {i18n.t("app.loading")}
        </main>
      ) : (
        <main className="flex h-screen flex-col overflow-hidden px-[14px] py-[12px]">
          {gardenState.rest.active ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(85,208,255,0.18),transparent_28%),linear-gradient(180deg,rgba(7,13,24,0.98),rgba(4,8,16,0.99))] px-6">
              <div className="w-full max-w-[420px] rounded-[28px] border border-white/10 bg-[rgba(8,15,28,0.92)] p-6 text-center shadow-[0_28px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <p className="m-0 text-sm font-medium tracking-[0.24em] text-cyan-200/72">
                  {i18n.t("rest.overlayEyebrow")}
                </p>
                <h2 className="mt-3 text-[34px] font-bold text-slate-50">
                  {formatCountdown(restRemainingSeconds)}
                </h2>
                <p className="mt-3 text-sm text-slate-300/80">
                  {i18n.t("rest.overlayDescription", {
                    hours: formatBoostHours(gardenState.rest.plannedBoostSeconds)
                  })}
                </p>
                <div className="mt-5 rounded-[18px] bg-white/6 px-4 py-3 text-left">
                  <span className="block text-xs text-slate-400">
                    {i18n.t("rest.overlayBoost")}
                  </span>
                  <strong className="mt-1 block text-lg text-slate-50">
                    {i18n.t("rest.overlayBoostValue", {
                      hours: formatBoostHours(gardenState.rest.plannedBoostSeconds)
                    })}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCancelRestBreak()}
                  className="mt-6 rounded-[16px] bg-white/10 px-4 py-3 font-semibold text-slate-100 transition hover:-translate-y-px hover:bg-white/16"
                >
                  {i18n.t("rest.cancel")}
                </button>
              </div>
            </div>
          ) : null}

          {yesterdayCatchUpItem ? (
            <StartupCatchUpModal
              historyItem={yesterdayCatchUpItem}
              amountMl={yesterdayCatchUpAmount}
              onChangeAmount={setYesterdayCatchUpAmount}
              onDismiss={handleDismissYesterdayCatchUp}
              onConfirm={() => void handleConfirmYesterdayCatchUp()}
            />
          ) : null}

          <div className="shrink-0">
            <WindowChrome
              activeTab={activeTab}
              onOpenSettings={() => setActiveTab("settings")}
              onMinimize={() => void handleWindowAction("minimize", () => appWindow.minimize())}
              onHide={() => void handleWindowAction("hide", () => appWindow.hide())}
            />
          </div>

          {message ? (
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none fixed bottom-4 right-4 z-50 max-w-[min(320px,calc(100vw-32px))] rounded-[16px] border border-cyan-200/20 bg-slate-950/92 px-4 py-3 text-sm text-cyan-50 shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-md"
            >
              {message}
            </div>
          ) : null}

          <div className="app-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            <PrimaryTabs
              activeTab={activeTab}
              onChange={(tab) => setActiveTab(tab)}
            />

            {activeTab === "today" ? (
              <TodayPanel
                settings={settings}
                status={status}
                quickAmount={quickAmount}
                setQuickAmount={setQuickAmount}
                onLog={(amountMl) => void handleLog(amountMl)}
                onUndo={() => void handleUndoLastDrink()}
              />
            ) : null}

            {activeTab === "history" ? (
              <HistoryPanel
                history={history}
                gardenState={gardenState}
                restState={gardenState.rest}
                restCooldownRemainingSeconds={restCooldownRemainingSeconds}
                onPlantSeed={(dayKey) => void handlePlantSeed(dayKey)}
                onHarvestCrop={(dayKey) => void handleHarvestCrop(dayKey)}
                onExchangeProduce={(ruleId) => void handleExchangeProduce(ruleId)}
                onStartRest={() => void handleStartRestBreak()}
              />
            ) : null}

            {activeTab === "leaderboard" ? (
              <LeaderboardPanel
                displayName={draftSettings.displayName}
                nicknameSaving={nicknameSaving}
                nicknameSaveState={nicknameSaveState}
                nicknameSaveMessage={nicknameSaveMessage}
                cloudIdentityState={cloudIdentityState}
                cloudIdentityError={cloudIdentityError}
                activeCircleCode={settings.activeCircleCode}
                activeCircleName={settings.activeCircleName}
                circles={circles}
                circlesLoadState={circlesLoadState}
                circleCodeInput={circleCodeInput}
                circleNameInput={circleNameInput}
                metric={leaderboardMetric}
                leaderboard={leaderboardEntries}
                loading={leaderboardLoading}
                onDisplayNameChange={(value) => {
                  setDraftSettings((current) => ({
                    ...current,
                    displayName: value
                  }));
                  setNicknameSaveState("idle");
                  setNicknameSaveMessage(null);
                }}
                onSaveDisplayName={() => void handleSaveDisplayName()}
                onCircleCodeInputChange={setCircleCodeInput}
                onCircleNameInputChange={setCircleNameInput}
                onCreateCircle={() => void handleCreateCircle()}
                onJoinCircle={() => void handleJoinCircle()}
                onReconnectIdentity={() => void handleReconnectLeaderboard()}
                onSelectCircle={(circle) => void handleSelectCircle(circle)}
                onMetricChange={setLeaderboardMetric}
                onRefresh={() => void refreshLeaderboard()}
              />
            ) : null}

            {activeTab === "settings" ? (
              <SettingsPanel
                draftSettings={draftSettings}
                reminderIntervalMinutes={reminderMeta.reminderIntervalMinutes}
                drinksPerDay={reminderMeta.drinksPerDay}
                version={APP_VERSION}
                updateInfo={updateInfo}
                copyright={COPYRIGHT}
                releaseUrl={RELEASE_URL}
                saving={saving}
                notificationState={notificationState}
                setDraftSettings={setDraftSettings}
                onAutostartChange={(enabled) => void handleAutostartChange(enabled)}
                onExportData={() => void handleExportData()}
                onImportData={() => void handleImportData()}
                onSave={() => void handleSaveSettings()}
              />
            ) : null}
          </div>
        </main>
      )}
    </I18nProvider>
  );

  async function syncCloudIdentity(nextSettings: Settings) {
    if (!nextSettings.deviceId) {
      return { circles: [] as CircleSummary[] };
    }

    const result = await bootstrapLeaderboard(nextSettings.deviceId, nextSettings.displayName);
    if (nextSettings.displayName.trim()) {
      await updateLeaderboardProfile(nextSettings.deviceId, nextSettings.displayName.trim());
    }

    return result;
  }

  async function refreshCirclesFromServer(deviceId: string) {
    try {
      const fetchedCircles = await listLeaderboardCircles(deviceId);
      await applyCircleSnapshot(settings.deviceId === deviceId ? settings : draftSettings, fetchedCircles);
    } catch {
      setCirclesLoadState("error");
    }
  }

  async function applyCircleSnapshot(
    baseSettings: Settings,
    fetchedCircles: CircleSummary[]
  ) {
    setCircles(fetchedCircles);
    setCirclesLoadState("ready");

    const activeCircle =
      fetchedCircles.find((circle) => circle.circleCode === baseSettings.activeCircleCode) ?? null;

    if (baseSettings.activeCircleCode && !activeCircle) {
      const fallbackCircle = fetchedCircles[0] ?? null;
      const saved = await saveSettings({
        ...baseSettings,
        activeCircleCode: fallbackCircle?.circleCode ?? "",
        activeCircleName: fallbackCircle?.circleName ?? ""
      });
      setSettings(saved);
      setDraftSettings(saved);
      return saved;
    }

    if (activeCircle && baseSettings.activeCircleName !== (activeCircle.circleName ?? "")) {
      const saved = await saveSettings({
        ...baseSettings,
        activeCircleName: activeCircle.circleName ?? ""
      });
      setSettings(saved);
      setDraftSettings(saved);
      return saved;
    }

    return baseSettings;
  }

  function extractErrorMessage(error: unknown) {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return "Failed to sync circles.";
  }
}

function upsertCircle(circles: CircleSummary[], circle: CircleSummary) {
  const existing = circles.find((item) => item.circleCode === circle.circleCode);
  if (existing) {
    return circles.map((item) =>
      item.circleCode === circle.circleCode
        ? {
            ...item,
            circleName: circle.circleName
          }
        : item
    );
  }

  return [circle, ...circles];
}

function findYesterdayCatchUpCandidate(history: HistoryItem[]) {
  const yesterdayKey = dayKeyOffset(-1);
  return history.find(
    (item) => item.dayKey === yesterdayKey && item.actualIntakeMl < item.targetMl
  ) ?? null;
}

function dayKeyOffset(offsetDays: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function currentDayKey() {
  return dayKeyOffset(0);
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatBoostHours(totalSeconds: number) {
  return Math.max(0, Math.round(totalSeconds / 3600));
}
