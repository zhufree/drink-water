import type { CSSProperties } from "react";
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
  toggleAutostart
} from "./api";
import type {
  HistoryItem,
  NotificationPermissionState,
  Settings,
  TodayStatus
} from "./types";

type TabKey = "today" | "history" | "settings";

const appWindow = getCurrentWindow();

const defaultSettings: Settings = {
  dailyTargetMl: 2000,
  cupSizeMl: 250,
  reminderIntervalMinutes: 60,
  activeStartHour: 9,
  activeEndHour: 22,
  notificationsEnabled: true,
  autostartEnabled: false
};

const tabLabels: Record<TabKey, string> = {
  today: "今日",
  history: "历史",
  settings: "设置"
};

function formatMl(value: number) {
  return `${value.toLocaleString("zh-CN")} ml`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "未安排";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function computeReminderMeta(settings: Settings) {
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

  const progressPercent = useMemo(() => {
    if (!status || status.targetMl <= 0) {
      return 0;
    }
    return clamp(Math.round((status.consumedMl / status.targetMl) * 100), 0, 100);
  }, [status]);

  const progressOrbitStyle = useMemo(
    () =>
      ({
        "--progress": `${progressPercent}%`
      }) as CSSProperties,
    [progressPercent]
  );

  const reminderMeta = useMemo(
    () => computeReminderMeta(draftSettings),
    [draftSettings]
  );

  const refreshAll = async () => {
    const [nextSettings, nextStatus, nextHistory] = await Promise.all([
      getSettings(),
      getTodayStatus(),
      getHistory(14)
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
    setHistory(await getHistory(14));
    setMessage(`已记录 ${formatMl(amountMl)}，系统会先补欠量，再增加今日净进度。`);
  };

  const handleWindowAction = async (
    actionName: "minimize" | "hide",
    action: () => Promise<void>
  ) => {
    console.log(`[window] ${actionName}:clicked`);
    setMessage(`窗口操作日志：正在尝试${actionName === "minimize" ? "最小化" : "收起到托盘"}...`);

    try {
      await action();
      console.log(`[window] ${actionName}:success`);
      setMessage(
        `窗口操作日志：${
          actionName === "minimize" ? "最小化" : "收起到托盘"
        }调用已发送成功。`
      );
    } catch (error) {
      const detail =
        error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      console.error(`[window] ${actionName}:failed`, error);
      setMessage(
        `窗口操作日志：${
          actionName === "minimize" ? "最小化" : "收起到托盘"
        }失败，${detail}`
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
      setMessage("设置已保存。后续提醒槽位会按新配置重新计算。");
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

  if (loading || !status) {
    return <main className="shell loading">正在准备你的补水助手...</main>;
  }

  return (
    <main className="shell">
      <header className="windowBar">
        <div className="windowDragZone" data-tauri-drag-region>
          <div className="windowBrand" data-tauri-drag-region>
            <span className="windowDot" data-tauri-drag-region />
            <div data-tauri-drag-region>
              <strong data-tauri-drag-region>Drink Water</strong>
              <span data-tauri-drag-region>桌面补水助手</span>
            </div>
          </div>
        </div>
        <div className="windowActions">
          <button
            className="windowButton"
            type="button"
            aria-label="最小化"
            onClick={(event) => {
              event.stopPropagation();
              void handleWindowAction("minimize", () => appWindow.minimize());
            }}
          >
            −
          </button>
          <button
            className="windowButton"
            type="button"
            aria-label="收起到托盘"
            onClick={(event) => {
              event.stopPropagation();
              void handleWindowAction("hide", () => appWindow.hide());
            }}
          >
            ×
          </button>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">DRINK WATER</p>
          <h1>把错过的那几口水，清楚地补回来</h1>
        </div>
        <div
          className="progressOrbit"
          style={progressOrbitStyle}
          aria-label={`今日完成 ${progressPercent}%`}
        >
          <strong>{progressPercent}%</strong>
          <span>今日净进度</span>
        </div>
      </section>

      <nav className="tabs" aria-label="功能切换">
        {(Object.keys(tabLabels) as TabKey[]).map((tab) => (
          <button
            key={tab}
            className={tab === activeTab ? "tab active" : "tab"}
            onClick={() => setActiveTab(tab)}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </nav>

      {message ? <p className="message">{message}</p> : null}

      {activeTab === "today" ? (
        <section className="panel stack">
          <div className="statsGrid">
            <article className="statCard">
              <span>今日目标</span>
              <strong>{formatMl(status.targetMl)}</strong>
            </article>
            <article className="statCard">
              <span>净完成</span>
              <strong>{formatMl(status.consumedMl)}</strong>
            </article>
            <article className="statCard accent">
              <span>当前欠量</span>
              <strong>{formatMl(status.debtMl)}</strong>
            </article>
            <article className="statCard">
              <span>实际喝水</span>
              <strong>{formatMl(status.actualIntakeMl)}</strong>
            </article>
          </div>

          <article className="focusCard">
            <div className="meter">
              <div className="meterFill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="focusMeta">
              <div>
                <span>距离达标</span>
                <strong>{formatMl(status.remainingMl)}</strong>
              </div>
              <div>
                <span>下一次提醒</span>
                <strong>{formatDateTime(status.nextReminderAt)}</strong>
              </div>
            </div>
          </article>

          <article className="actionCard">
            <div className="cardHeader">
              <div>
                <h2>快速记录</h2>
                <p>默认一键记一杯，也可以微调这次实际喝了多少。</p>
              </div>
              {status.pendingReminder ? (
                <button
                  className="ghostButton"
                  onClick={() => void dismissOrSnoozeReminder()}
                >
                  稍后再提醒
                </button>
              ) : null}
            </div>

            <div className="quickControls">
              <button
                className="ghostButton"
                onClick={() => setQuickAmount((value) => Math.max(50, value - 100))}
              >
                -100 ml
              </button>
              <div className="amountBadge">{quickAmount} ml</div>
              <button
                className="ghostButton"
                onClick={() => setQuickAmount((value) => value + 100)}
              >
                +100 ml
              </button>
              <button
                className="ghostButton"
                onClick={() => setQuickAmount(settings.cupSizeMl)}
              >
                还原单杯
              </button>
            </div>

            <div className="actionRow">
              <button
                className="primaryButton"
                onClick={() => void handleLog(settings.cupSizeMl)}
              >
                记一杯 {settings.cupSizeMl} ml
              </button>
              <button
                className="secondaryButton"
                onClick={() => void handleLog(quickAmount)}
              >
                记录 {quickAmount} ml
              </button>
            </div>
          </article>

          <article className="hintCard">
            <h3>提醒槽位</h3>
            <div className="hintGrid">
              <div>
                <span>按时完成</span>
                <strong>{status.completedReminderSlots}</strong>
              </div>
              <div>
                <span>已欠批次</span>
                <strong>{status.missedReminderSlots}</strong>
              </div>
              <div>
                <span>当前状态</span>
                <strong>
                  {status.pendingReminder
                    ? `等待处理（${formatDateTime(status.pendingSince)}）`
                    : "节奏正常"}
                </strong>
              </div>
            </div>
          </article>

          <article className="noticeCard">
            <strong>欠水量说明</strong>
            <p>
              欠量不会在一天开始时一次性出现。它只会在你错过某个提醒时段后，
              按该时段应喝的份额累加。
            </p>
            <div className="actionRow debugRow">
              <button
                className="ghostButton"
                onClick={() => void handleWindowAction("minimize", () => appWindow.minimize())}
              >
                测试最小化
              </button>
              <button
                className="ghostButton"
                onClick={() => void handleWindowAction("hide", () => appWindow.hide())}
              >
                测试收起到托盘
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "history" ? (
        <section className="panel stack">
          <div className="cardHeader">
            <div>
              <h2>最近 14 天</h2>
              <p>看清哪些天按时喝够了，哪些天是之后慢慢补回来的。</p>
            </div>
          </div>
          <div className="historyList">
            {history.map((item) => (
              <article key={item.dayKey} className="historyCard">
                <div>
                  <strong>{item.dayKey}</strong>
                  <p>
                    实际 {formatMl(item.actualIntakeMl)} / 净完成{" "}
                    {formatMl(item.consumedMl)}
                  </p>
                </div>
                <div className="historyMeta">
                  <span>欠量累计 {formatMl(item.debtIncurredMl)}</span>
                  <span>{item.goalMet ? "已达标" : "未达标"}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "settings" ? (
        <section className="panel stack">
          <div className="cardHeader">
            <div>
              <h2>常规设置</h2>
              <p>当天目标会被自动分摊到每个提醒时段里，错过时才会形成欠量。</p>
            </div>
          </div>

          <div className="settingsGrid">
            <label className="field">
              <span>每日目标（ml）</span>
              <input
                type="number"
                min={500}
                step={100}
                value={draftSettings.dailyTargetMl}
                onChange={(event) =>
                  setDraftSettings((current) => ({
                    ...current,
                    dailyTargetMl: Number(event.target.value)
                  }))
                }
              />
            </label>

            <label className="field">
              <span>单杯容量（ml）</span>
              <input
                type="number"
                min={50}
                step={50}
                value={draftSettings.cupSizeMl}
                onChange={(event) =>
                  setDraftSettings((current) => ({
                    ...current,
                    cupSizeMl: Number(event.target.value)
                  }))
                }
              />
            </label>

            <label className="field">
              <span>提醒间隔（分钟）</span>
              <input
                type="number"
                value={reminderMeta.reminderIntervalMinutes}
                readOnly
              />
              <small className="fieldHint">
                自动计算：{reminderMeta.drinksPerDay} 次喝水，约每{" "}
                {reminderMeta.reminderIntervalMinutes} 分钟提醒一次
              </small>
            </label>

            <label className="field">
              <span>开始提醒时间（小时）</span>
              <input
                type="number"
                min={0}
                max={23}
                value={draftSettings.activeStartHour}
                onChange={(event) =>
                  setDraftSettings((current) => ({
                    ...current,
                    activeStartHour: Number(event.target.value)
                  }))
                }
              />
            </label>

            <label className="field">
              <span>结束提醒时间（小时）</span>
              <input
                type="number"
                min={1}
                max={23}
                value={draftSettings.activeEndHour}
                onChange={(event) =>
                  setDraftSettings((current) => ({
                    ...current,
                    activeEndHour: Number(event.target.value)
                  }))
                }
              />
            </label>
          </div>

          <div className="toggleList">
            <label className="toggleRow">
              <span>系统通知</span>
              <input
                type="checkbox"
                checked={draftSettings.notificationsEnabled}
                onChange={(event) =>
                  setDraftSettings((current) => ({
                    ...current,
                    notificationsEnabled: event.target.checked
                  }))
                }
              />
            </label>
            <label className="toggleRow">
              <span>开机自启</span>
              <input
                type="checkbox"
                checked={draftSettings.autostartEnabled}
                onChange={(event) => void handleAutostartChange(event.target.checked)}
              />
            </label>
          </div>

          <div className="noticeCard">
            <strong>通知权限</strong>
            <p>
              当前状态：
              {notificationState === "granted"
                ? "已允许"
                : notificationState === "denied"
                  ? "已拒绝，提醒可能无法弹出"
                  : notificationState === "unsupported"
                    ? "当前环境不支持前端检测"
                    : "等待系统确认"}
            </p>
          </div>

          <button
            className="primaryButton wide"
            disabled={saving}
            onClick={() => void handleSaveSettings()}
          >
            {saving ? "正在保存..." : "保存设置"}
          </button>
        </section>
      ) : null}
    </main>
  );
}
