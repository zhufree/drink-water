import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ExternalLink, X } from "lucide-react";
import {
  getSedentaryStatus,
  getSettings,
  getTodayStatus,
  logDrink,
  toggleSedentaryState
} from "../api";
import type { Locale, SedentaryStatus, Settings, TodayStatus } from "../types";
import { clamp } from "../utils";
import { WaterBabyAvatar } from "./waterBaby/WaterBabyAvatar";
import { HoldToConfirmButton } from "./HoldToConfirmButton";

const petWindow = getCurrentWindow();

const copy = {
  "zh-CN": {
    hydration: "今日喝水",
    sitting: "已坐",
    standing: "已起身",
    standNow: "该起身啦",
    standUrgent: "久坐超时",
    holdToDrink: "长按记一杯水",
    drinkError: "记水失败，请重试",
    tapToStand: "点击记录起身",
    tapToSit: "点击开始坐下计时",
    open: "打开主窗口",
    hide: "隐藏桌宠",
    loading: "水宝宝醒来中",
    error: "暂时没读到状态"
  },
  "en-US": {
    hydration: "Today",
    sitting: "Seated",
    standing: "Up for",
    standNow: "Time to stand",
    standUrgent: "Stand up now",
    holdToDrink: "Hold to log one cup",
    drinkError: "Could not log water. Try again",
    tapToStand: "Tap to mark standing",
    tapToSit: "Tap to start sitting timer",
    open: "Open main window",
    hide: "Hide desktop pet",
    loading: "Water baby is waking up",
    error: "Status is unavailable"
  }
} as const;

function elapsedMs(anchor: string | null, now: number) {
  if (!anchor) {
    return 0;
  }

  const startedAt = new Date(anchor).getTime();
  return Number.isFinite(startedAt) ? Math.max(0, now - startedAt) : 0;
}

function formatClock(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];
  return parts.map((value) => String(value).padStart(2, "0")).join(":");
}

export function DesktopPet() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [today, setToday] = useState<TodayStatus | null>(null);
  const [sedentary, setSedentary] = useState<SedentaryStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [loggingDrink, setLoggingDrink] = useState(false);
  const [drinkFailed, setDrinkFailed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [nextSettings, nextToday, nextSedentary] = await Promise.all([
        getSettings(),
        getTodayStatus(),
        getSedentaryStatus()
      ]);
      setSettings(nextSettings);
      setToday(nextToday);
      setSedentary(nextSedentary);
      setError(false);
    } catch (refreshError) {
      console.error("[desktop-pet] failed to refresh", refreshError);
      setError(true);
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void refresh();
    void listen("state-updated", () => {
      if (!disposed) {
        void refresh();
      }
    }).then((stopListening) => {
      if (disposed) {
        void stopListening();
      } else {
        unlisten = stopListening;
      }
    });

    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const stateRefresh = window.setInterval(() => void refresh(), 30_000);

    return () => {
      disposed = true;
      window.clearInterval(clock);
      window.clearInterval(stateRefresh);
      unlisten?.();
    };
  }, [refresh]);

  const locale: Locale = settings?.locale === "en-US" ? "en-US" : "zh-CN";
  const text = copy[locale];
  const progress = clamp(
    Math.round(((today?.actualIntakeMl ?? 0) / Math.max(1, today?.targetMl ?? 1)) * 100),
    0,
    100
  );
  const activeAnchor = sedentary?.seated ? sedentary.seatedSince : sedentary?.stoodUpAt;
  const activeDuration = elapsedMs(activeAnchor ?? null, now);
  const reminderDuration = Math.max(1, settings?.sedentaryReminderMinutes ?? 20) * 60_000;
  const breakDue = Boolean(sedentary?.seated && activeDuration >= reminderDuration);
  const breakOverdue = Boolean(sedentary?.seated && activeDuration > 2 * 60 * 60_000);
  const statusLabel = error
    ? text.error
    : !sedentary
      ? text.loading
      : breakOverdue
        ? text.standUrgent
      : breakDue
        ? text.standNow
        : sedentary.seated
          ? text.sitting
          : text.standing;
  const statusAction = sedentary?.seated ? text.tapToStand : text.tapToSit;

  const handleLogDrink = async () => {
    if (!settings || loggingDrink) return;
    setLoggingDrink(true);
    setDrinkFailed(false);
    try {
      setToday(await logDrink(settings.cupSizeMl));
    } catch (logError) {
      console.error("[desktop-pet] failed to log water", logError);
      setDrinkFailed(true);
    } finally {
      setLoggingDrink(false);
    }
  };

  const handleToggleSedentary = async () => {
    if (toggling) {
      return;
    }
    setToggling(true);
    try {
      setSedentary(await toggleSedentaryState());
      setNow(Date.now());
    } catch (toggleError) {
      console.error("[desktop-pet] failed to toggle sedentary state", toggleError);
      setError(true);
    } finally {
      setToggling(false);
    }
  };

  return (
    <main
      data-tauri-drag-region
      className="desktop-pet group relative flex h-screen w-screen select-none flex-col items-center justify-end overflow-hidden px-1.5 pb-1.5 pt-1"
    >
      <div className="absolute right-1.5 top-1.5 z-40 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          aria-label={text.open}
          title={text.open}
          onClick={() => void invoke("show_main_window_command")}
          className="grid h-6 w-6 place-items-center rounded-full border border-white/80 bg-[#eefaff]/94 text-[#174c68] shadow-[0_4px_12px_rgba(15,73,105,0.22)] transition hover:-translate-y-px hover:bg-white"
        >
          <ExternalLink size={11} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          aria-label={text.hide}
          title={text.hide}
          onClick={() => void petWindow.hide()}
          className="grid h-6 w-6 place-items-center rounded-full border border-white/80 bg-[#eefaff]/94 text-[#174c68] shadow-[0_4px_12px_rgba(15,73,105,0.22)] transition hover:-translate-y-px hover:bg-white"
        >
          <X size={12} strokeWidth={2.2} />
        </button>
      </div>

      <HoldToConfirmButton
        className={`pet-baby relative z-10 touch-none rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${breakDue || breakOverdue ? "pet-baby--alert" : ""}`}
        ariaLabel={`${text.holdToDrink} (${settings?.cupSizeMl ?? 0} ml)`}
        title={`${drinkFailed ? text.drinkError : text.holdToDrink} · ${text.hydration} ${today?.actualIntakeMl ?? 0} / ${today?.targetMl ?? 0} ml`}
        progressClassName="hidden"
        cooldownMs={550}
        disabled={!settings || !today || loggingDrink}
        onComplete={() => void handleLogDrink()}
        onDrag={() => void petWindow.startDragging().catch(console.error)}
      >
        <WaterBabyAvatar
          state="home"
          fillPercent={progress}
          holdFeedback
          className="h-[124px] w-[104px]"
        />
      </HoldToConfirmButton>
      <span role="status" className="sr-only">{drinkFailed ? text.drinkError : ""}</span>

      <button
        type="button"
        disabled={!sedentary || toggling}
        onClick={() => void handleToggleSedentary()}
        aria-label={`${statusLabel} ${formatClock(activeDuration)}。${statusAction}`}
        title={statusAction}
        className={`relative z-10 -mt-2.5 flex h-[43px] w-full max-w-[150px] items-center justify-between rounded-full border px-3 shadow-[0_7px_18px_rgba(14,80,112,0.2)] backdrop-blur-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:opacity-80 ${
          breakOverdue
            ? "border-red-300 bg-red-100/96 text-red-900 hover:bg-red-50"
          : breakDue
            ? "border-[#ffe5a2] bg-[#fff1c9]/96 text-[#74400e] hover:bg-[#fff7df]"
            : "border-white/85 bg-[#eefaff]/95 text-[#173f54] hover:bg-white"
        }`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              breakOverdue ? "bg-red-600" : breakDue ? "bg-amber-500" : sedentary?.seated ? "bg-sky-500" : "bg-emerald-500"
            }`}
          />
          <span className="truncate text-[9px] font-bold tracking-[0.08em] opacity-75">
            {statusLabel}
          </span>
        </span>
        <strong className="ml-2 shrink-0 text-[16px] font-extrabold leading-none tabular-nums tracking-tight">
          {formatClock(activeDuration)}
        </strong>
      </button>
    </main>
  );
}
