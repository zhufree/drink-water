import type { NotificationPermissionState, Settings } from "../types";
import type { Dispatch, SetStateAction } from "react";

type SettingsPanelProps = {
  draftSettings: Settings;
  reminderIntervalMinutes: number;
  drinksPerDay: number;
  saving: boolean;
  notificationState: NotificationPermissionState;
  setDraftSettings: Dispatch<SetStateAction<Settings>>;
  onAutostartChange: (enabled: boolean) => void;
  onSave: () => void;
};

export function SettingsPanel({
  draftSettings,
  reminderIntervalMinutes,
  drinksPerDay,
  saving,
  notificationState,
  setDraftSettings,
  onAutostartChange,
  onSave
}: SettingsPanelProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <h2 className="m-0 text-lg font-semibold text-slate-50">常规设置</h2>
        <p className="mt-1 text-sm text-slate-300/78">
          提醒节奏会根据目标量、单杯容量和提醒时间自动计算。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-2 rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
          <span className="text-sm text-slate-300/70">每日目标（ml）</span>
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
            className="rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 outline-none"
          />
        </label>

        <label className="flex flex-col gap-2 rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
          <span className="text-sm text-slate-300/70">单杯容量（ml）</span>
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
            className="rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 outline-none"
          />
        </label>

        <label className="flex flex-col gap-2 rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
          <span className="text-sm text-slate-300/70">提醒间隔（分钟）</span>
          <input
            type="number"
            value={reminderIntervalMinutes}
            readOnly
            className="rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 outline-none"
          />
          <small className="text-xs text-slate-300/60">
            自动计算：{drinksPerDay} 次喝水，约每 {reminderIntervalMinutes} 分钟提醒一次
          </small>
        </label>

        <label className="flex flex-col gap-2 rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
          <span className="text-sm text-slate-300/70">开始提醒时间（小时）</span>
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
            className="rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 outline-none"
          />
        </label>

        <label className="flex flex-col gap-2 rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
          <span className="text-sm text-slate-300/70">结束提醒时间（小时）</span>
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
            className="rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 outline-none"
          />
        </label>
      </div>

      <div className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <div className="flex flex-col gap-4">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-200">系统通知</span>
            <input
              type="checkbox"
              checked={draftSettings.notificationsEnabled}
              onChange={(event) =>
                setDraftSettings((current) => ({
                  ...current,
                  notificationsEnabled: event.target.checked
                }))
              }
              className="h-4 w-4"
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-200">开机自启</span>
            <input
              type="checkbox"
              checked={draftSettings.autostartEnabled}
              onChange={(event) => onAutostartChange(event.target.checked)}
              className="h-4 w-4"
            />
          </label>
        </div>
      </div>

      <div className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <strong className="text-sm font-semibold text-slate-50">通知权限</strong>
        <p className="mt-2 text-sm text-slate-300/78">
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
        disabled={saving}
        onClick={onSave}
        className="w-full rounded-[14px] bg-gradient-to-r from-sky-300 to-emerald-300 px-4 py-3 font-semibold text-slate-950 transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "正在保存..." : "保存设置"}
      </button>
    </section>
  );
}
