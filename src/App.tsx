import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  isPermissionGranted,
  requestPermission
} from "@tauri-apps/plugin-notification";
import {
  dismissOrSnoozeReminder,
  getHistory,
  getSettings,
  getTodayStatus,
  logDrink,
  saveSettings,
  toggleAutostart,
  undoLastDrink
} from "./api";
import { HistoryPanel } from "./components/HistoryPanel";
import { PrimaryTabs } from "./components/PrimaryTabs";
import { SettingsPanel } from "./components/SettingsPanel";
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
const APP_VERSION = "0.2.0";
const RELEASE_URL = "https://github.com/zhufree/drink-water/releases";
const COPYRIGHT = "Copyright © 2026 zhufree";

const appWindow = getCurrentWindow();

const defaultSettings: Settings = {
  dailyTargetMl: 2000,
  cupSizeMl: 250,
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
        await refreshAll();
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

  return (
    <I18nProvider locale={locale}>
      {loading || !status ? (
        <main className="grid min-h-screen place-items-center text-slate-200/80">
          {i18n.t("app.loading")}
        </main>
      ) : (
        <main className="min-h-screen">
          <WindowChrome
            activeTab={activeTab}
            onOpenSettings={() => setActiveTab("settings")}
            onMinimize={() => void handleWindowAction("minimize", () => appWindow.minimize())}
            onHide={() => void handleWindowAction("hide", () => appWindow.hide())}
          />

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
              onSnooze={() => void dismissOrSnoozeReminder()}
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
              onSave={() => void handleSaveSettings()}
            />
          ) : null}
        </main>
      )}
    </I18nProvider>
  );
}
