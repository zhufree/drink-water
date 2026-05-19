import type { Settings, TodayStatus } from "../types";
import { clamp, formatDateTime, formatMl } from "../utils";

type TodayPanelProps = {
  settings: Settings;
  status: TodayStatus;
  quickAmount: number;
  setQuickAmount: (updater: number | ((value: number) => number)) => void;
  onLog: (amountMl: number) => void;
  onSnooze: () => void;
};

function widthPercent(value: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return clamp((value / target) * 100, 0, 100);
}

export function TodayPanel({
  settings,
  status,
  quickAmount,
  setQuickAmount,
  onLog,
  onSnooze
}: TodayPanelProps) {
  const actualWidth = widthPercent(status.actualIntakeMl, status.targetMl);
  const debtWidth = clamp(
    widthPercent(status.debtMl, status.targetMl),
    0,
    Math.max(0, 100 - actualWidth)
  );
  const netWidth = clamp(widthPercent(status.consumedMl, status.targetMl), 0, actualWidth);
  const progressPercent = clamp(
    Math.round(widthPercent(status.actualIntakeMl, status.targetMl)),
    0,
    100
  );

  return (
    <section className="flex flex-col gap-3">
      <article className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-[28px] font-bold leading-none text-slate-50">今日水量概览</h2>
              <div className="rounded-2xl py-2">
                <span className="text-xs text-slate-300/70 mr-2">下次提醒</span>
                <strong className="mt-1 text-base font-semibold text-slate-50">
                  {formatDateTime(status.nextReminderAt)}
                </strong>
              </div>
            </div>
            <div className="min-w-[88px] rounded-2xl bg-white/5 px-3 py-2 text-center">
              <span className="block text-xs text-slate-300/70">今日进度</span>
              <strong className="mt-1 block text-3xl font-bold text-slate-50">
                {progressPercent}%
              </strong>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          
        </div>

        <div className="relative h-14 overflow-hidden rounded-full border border-white/10 bg-white/5">
          {actualWidth > 0 ? (
            <div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r from-sky-400 to-blue-500 ${
                debtWidth > 0 ? "rounded-l-full rounded-r-none" : "rounded-full"
              }`}
              style={{ width: `${actualWidth}%` }}
            />
          ) : null}

          {debtWidth > 0 ? (
            <div
              className={`absolute inset-y-0 bg-gradient-to-r from-rose-400 to-red-500 ${
                actualWidth > 0 ? "rounded-l-none rounded-r-full" : "rounded-full"
              }`}
              style={{ left: `${actualWidth}%`, width: `${debtWidth}%` }}
            />
          ) : null}

          {netWidth > 0 ? (
            <div
              className="absolute bottom-2 left-0 top-2 rounded-full bg-gradient-to-r from-emerald-300 to-emerald-500 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
              style={{ width: `${netWidth}%` }}
            />
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm text-slate-100">
            <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
            今日目标 {formatMl(status.targetMl)}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm text-slate-100">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            实际喝水 {formatMl(status.actualIntakeMl)}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm text-slate-100">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            当前欠量 {formatMl(status.debtMl)}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm text-slate-100">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            净完成 {formatMl(status.consumedMl)}
          </span>
        </div>
      </article>

      <article className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-semibold text-slate-50">快速记录</h2>
            <p className="mt-1 text-sm text-slate-300/78">
              默认一键记一杯，也可以微调这次实际喝了多少。
            </p>
          </div>
          {status.pendingReminder ? (
            <button
              onClick={onSnooze}
              className="rounded-[14px] bg-white/8 px-3 py-2 text-sm text-slate-100 transition hover:-translate-y-px hover:bg-white/14"
            >
              稍后提醒
            </button>
          ) : null}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setQuickAmount((value) => Math.max(50, value - 100))}
            className="rounded-[14px] bg-white/8 px-3 py-2 text-sm text-slate-100 transition hover:-translate-y-px hover:bg-white/14"
          >
            -100 ml
          </button>
          <div className="min-w-[98px] rounded-[14px] bg-white/8 px-3 py-2 text-center font-semibold text-slate-50">
            {quickAmount} ml
          </div>
          <button
            onClick={() => setQuickAmount((value) => value + 100)}
            className="rounded-[14px] bg-white/8 px-3 py-2 text-sm text-slate-100 transition hover:-translate-y-px hover:bg-white/14"
          >
            +100 ml
          </button>
          <button
            onClick={() => setQuickAmount(settings.cupSizeMl)}
            className="rounded-[14px] bg-white/8 px-3 py-2 text-sm text-slate-100 transition hover:-translate-y-px hover:bg-white/14"
          >
            还原单杯
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onLog(settings.cupSizeMl)}
            className="rounded-[14px] bg-gradient-to-r from-sky-300 to-emerald-300 px-4 py-3 font-semibold text-slate-950 transition hover:-translate-y-px"
          >
            记一杯 {settings.cupSizeMl} ml
          </button>
          <button
            onClick={() => onLog(quickAmount)}
            className="rounded-[14px] bg-white/10 px-4 py-3 font-medium text-slate-50 transition hover:-translate-y-px hover:bg-white/14"
          >
            记录 {quickAmount} ml
          </button>
        </div>
      </article>
    </section>
  );
}
