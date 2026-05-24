import { useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  isPermissionGranted,
  requestPermission
} from "@tauri-apps/plugin-notification";
import {
  exportData,
  getHistory,
  getSettings,
  getTodayStatus,
  importData,
  logYesterdayDrink,
  logDrink,
  saveSettings,
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
  HistoryItem,
  LeaderboardEntry,
  Locale,
  NotificationPermissionState,
  Settings,
  TodayStatus
} from "./types";
import { computeReminderMeta } from "./utils";

type TabKey = "today" | "history" | "leaderboard" | "settings";

const APP_VERSION = "0.4.0";
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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [draftSettings, setDraftSettings] = useState<Settings>(defaultSettings);
  const [status, setStatus] = useState<TodayStatus | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
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
  const [circleCodeInput, setCircleCodeInput] = useState("");
  const [circleNameInput, setCircleNameInput] = useState("");
  const [leaderboardMetric, setLeaderboardMetric] =
    useState<"intake" | "progress">("intake");
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);

  const startupPromptCheckedRef = useRef(false);
  const lastSyncedStatsKeyRef = useRef("");
  const displayNameSyncTimerRef = useRef<number | null>(null);
  const displayNameSyncVersionRef = useRef(0);

  const locale: Locale = draftSettings.locale ?? settings.locale ?? "zh-CN";
  const i18n = useMemo(() => createI18n(locale), [locale]);

  const reminderMeta = useMemo(
    () => computeReminderMeta(draftSettings),
    [draftSettings]
  );

  const refreshAll = async () => {
    const [nextSettings, nextStatus, nextHistory] = await Promise.all([
      getSettings(),
      getTodayStatus(),
      getHistory(56)
    ]);

    setSettings(nextSettings);
    setDraftSettings(nextSettings);
    setQuickAmount((current) =>
      current === settings.cupSizeMl ? nextSettings.cupSizeMl : current
    );
    setStatus(nextStatus);
    setHistory(nextHistory);

    return { nextSettings, nextStatus, nextHistory };
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

        await syncCloudIdentity(nextSettings);
        const fetchedCircles = await listLeaderboardCircles(nextSettings.deviceId);
        setCircles(fetchedCircles);
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

        if (
          nextSettings.activeCircleCode &&
          !fetchedCircles.some((circle) => circle.circleCode === nextSettings.activeCircleCode)
        ) {
          const firstCircle = fetchedCircles[0] ?? null;
          if (firstCircle) {
            const saved = await saveSettings({
              ...nextSettings,
              activeCircleCode: firstCircle.circleCode,
              activeCircleName: firstCircle.circleName ?? ""
            });
            setSettings(saved);
            setDraftSettings(saved);
            nextSettings = saved;
          }
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
    if (!settings.deviceId || draftSettings.displayName === settings.displayName) {
      return;
    }

    if (displayNameSyncTimerRef.current !== null) {
      window.clearTimeout(displayNameSyncTimerRef.current);
    }

    const syncVersion = ++displayNameSyncVersionRef.current;
    displayNameSyncTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const saved = await saveSettings({
            ...settings,
            displayName: draftSettings.displayName
          });

          if (syncVersion !== displayNameSyncVersionRef.current) {
            return;
          }

          setSettings(saved);
          setDraftSettings((current) => ({ ...current, displayName: saved.displayName }));
          await syncCloudIdentity(saved);

          if (saved.activeCircleCode) {
            await refreshLeaderboard();
          }
        } catch {
          // Ignore transient sync failures to avoid interrupting typing.
        }
      })();
    }, 500);

    return () => {
      if (displayNameSyncTimerRef.current !== null) {
        window.clearTimeout(displayNameSyncTimerRef.current);
      }
    };
  }, [draftSettings.displayName, settings, settings.deviceId]);

  useEffect(() => {
    return () => {
      if (displayNameSyncTimerRef.current !== null) {
        window.clearTimeout(displayNameSyncTimerRef.current);
      }
    };
  }, []);

  const handleLog = async (amountMl: number) => {
    setMessage("");
    const nextStatus = await logDrink(amountMl);
    setStatus(nextStatus);
    setHistory(await getHistory(56));
    setMessage(i18n.t("message.logged", { amount: i18n.formatMl(amountMl) }));
  };

  const handleUndoLastDrink = async () => {
    setMessage("");
    const previousAmount = status?.lastLoggedAmountMl ?? null;
    const nextStatus = await undoLastDrink();
    setStatus(nextStatus);
    setHistory(await getHistory(56));
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
      await syncCloudIdentity(saved);
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

  const handleCreateCircle = async () => {
    if (!settings.deviceId) {
      return;
    }

    const result = await createLeaderboardCircle(settings.deviceId, circleNameInput.trim());
    const nextSettings = await saveSettings({
      ...settings,
      activeCircleCode: result.circleCode,
      activeCircleName: result.circleName ?? ""
    });
    setSettings(nextSettings);
    setDraftSettings(nextSettings);
    setCircleNameInput("");
    const fetchedCircles = await listLeaderboardCircles(settings.deviceId);
    setCircles(fetchedCircles);
    setActiveTab("leaderboard");
    setMessage(
      i18n.t("message.circleCreated", {
        code: result.circleCode
      })
    );
  };

  const handleJoinCircle = async () => {
    if (!settings.deviceId) {
      return;
    }

    const result = await joinLeaderboardCircle(settings.deviceId, circleCodeInput.trim());
    const nextSettings = await saveSettings({
      ...settings,
      activeCircleCode: result.circleCode,
      activeCircleName: result.circleName ?? ""
    });
    setSettings(nextSettings);
    setDraftSettings(nextSettings);
    setCircleCodeInput("");
    const fetchedCircles = await listLeaderboardCircles(settings.deviceId);
    setCircles(fetchedCircles);
    setActiveTab("leaderboard");
    setMessage(
      i18n.t("message.circleJoined", {
        code: result.circleCode
      })
    );
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

  return (
    <I18nProvider locale={locale}>
      {loading || !status ? (
        <main className="grid h-screen place-items-center px-[14px] py-[12px] text-slate-200/80">
          {i18n.t("app.loading")}
        </main>
      ) : (
        <main className="flex h-screen flex-col overflow-hidden px-[14px] py-[12px]">
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

          <div className="app-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            <PrimaryTabs
              activeTab={activeTab}
              onChange={(tab) => setActiveTab(tab)}
            />

            {message ? (
              <p className="mb-3 rounded-[14px] bg-cyan-300/14 px-3 py-2 text-sm text-cyan-100">
                {message}
              </p>
            ) : null}

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

            {activeTab === "history" ? <HistoryPanel history={history} /> : null}

            {activeTab === "leaderboard" ? (
              <LeaderboardPanel
                displayName={draftSettings.displayName}
                activeCircleCode={settings.activeCircleCode}
                activeCircleName={settings.activeCircleName}
                circles={circles}
                circleCodeInput={circleCodeInput}
                circleNameInput={circleNameInput}
                metric={leaderboardMetric}
                leaderboard={leaderboardEntries}
                loading={leaderboardLoading}
                onDisplayNameChange={(value) =>
                  setDraftSettings((current) => ({
                    ...current,
                    displayName: value
                  }))
                }
                onCircleCodeInputChange={setCircleCodeInput}
                onCircleNameInputChange={setCircleNameInput}
                onCreateCircle={() => void handleCreateCircle()}
                onJoinCircle={() => void handleJoinCircle()}
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
      return;
    }

    await bootstrapLeaderboard(nextSettings.deviceId, nextSettings.displayName);
    if (nextSettings.displayName.trim()) {
      await updateLeaderboardProfile(nextSettings.deviceId, nextSettings.displayName.trim());
    }
  }
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
