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
import { PrimaryTabs } from "./components/PrimaryTabs";
import { SettingsPanel } from "./components/SettingsPanel";
import { StartupCatchUpModal } from "./components/StartupCatchUpModal";
import { TodayPanel } from "./components/TodayPanel";
import { WindowChrome } from "./components/WindowChrome";
import { I18nProvider, createI18n } from "./i18n";
import type {
  HistoryItem,
  Locale,
  NotificationPermissionState,
  Settings,
  TodayStatus
} from "./types";
import { computeReminderMeta } from "./utils";

type TabKey = "today" | "history" | "settings";

const APP_VERSION = "0.3.1";
const RELEASE_URL = "https://github.com/zhufree/drink-water/releases";
const COPYRIGHT = "Copyright (c) 2026 zhufree";

const appWindow = getCurrentWindow();

const defaultSettings: Settings = {
  dailyTargetMl: 2000,
  cupSizeMl: 250,
  cupStepMl: 50,
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
  const startupPromptCheckedRef = useRef(false);

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
        const { nextHistory } = await refreshAll();
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

            {activeTab === "settings" ? (
              <SettingsPanel
                draftSettings={draftSettings}
                reminderIntervalMinutes={reminderMeta.reminderIntervalMinutes}
                drinksPerDay={reminderMeta.drinksPerDay}
                version={APP_VERSION}
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
