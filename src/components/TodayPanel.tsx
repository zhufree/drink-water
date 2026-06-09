import { useI18n } from "../i18n";
import type { Settings, TodayStatus } from "../types";
import { clamp } from "../utils";

type TodayPanelProps = {
  settings: Settings;
  status: TodayStatus;
  quickAmount: number;
  setQuickAmount: (updater: number | ((value: number) => number)) => void;
  onLog: (amountMl: number) => void;
  onUndo: () => void;
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
  onUndo
}: TodayPanelProps) {
  const { t, formatMl } = useI18n();
  const cupStep = Math.max(10, settings.cupStepMl);
  const expectedWidth = widthPercent(status.expectedMl, status.targetMl);
  const actualWidth = widthPercent(status.actualIntakeMl, status.targetMl);
  const debtWidth = Math.max(0, expectedWidth - actualWidth);
  const progressPercent = clamp(
    Math.round(widthPercent(status.actualIntakeMl, status.targetMl)),
    0,
    100
  );

  return (
    <section className="flex flex-col gap-3">
      <article className="panel-surface rounded-[22px] p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="m-0 text-base font-semibold leading-none text-slate-300/82">
                {t("today.title")}
              </h2>
              <div className="mt-3 whitespace-nowrap text-clarity text-[36px] font-bold leading-none text-slate-50 sm:text-[46px]">
                {formatMl(status.actualIntakeMl)}
              </div>
            </div>
            <div
              className="relative h-[98px] w-[98px] shrink-0 overflow-hidden rounded-full border border-sky-100/25 bg-slate-950/28 shadow-[inset_0_0_18px_rgba(255,255,255,0.16),0_12px_28px_rgba(15,23,42,0.28)]"
              aria-label={`${t("today.progress")} ${progressPercent}%`}
            >
              <div
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sky-500 via-cyan-300 to-sky-200 transition-[height] duration-500 ease-out"
                style={{ height: `${progressPercent}%` }}
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_22%,rgba(255,255,255,0.48),transparent_24%),radial-gradient(circle_at_65%_78%,rgba(12,74,110,0.26),transparent_35%)]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-clarity text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-100/78">
                  {t("today.progress")}
                </span>
                <strong className="text-clarity mt-1 text-[28px] font-bold leading-none text-white drop-shadow-[0_2px_5px_rgba(8,47,73,0.48)]">
                  {progressPercent}%
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="relative h-14 overflow-hidden rounded-full border border-white/8 bg-white/4">
          {expectedWidth > 0 ? (
            <div
              className="absolute inset-y-0 left-0 rounded-l-full rounded-r-none bg-gradient-to-r from-sky-400/35 to-blue-500/35"
              style={{ width: `${expectedWidth}%` }}
            />
          ) : null}

          {debtWidth > 0 ? (
            <div
              className="absolute inset-y-0 rounded-l-none rounded-r-none bg-gradient-to-r from-rose-400 to-red-500/90"
              style={{ left: `${actualWidth}%`, width: `${debtWidth}%` }}
            />
          ) : null}

          {actualWidth > 0 ? (
            <div
              className="absolute inset-y-0 left-0 rounded-l-full rounded-r-none bg-gradient-to-r from-emerald-300 to-emerald-500"
              style={{ width: `${actualWidth}%` }}
            />
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="inline-flex min-h-[48px] items-center gap-2 rounded-[16px] border border-white/8 bg-white/4 px-3 py-2 text-sm text-slate-100">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white/35 ring-4 ring-white/6" />
            <span className="text-clarity">{t("today.target", { amount: formatMl(status.targetMl) })}</span>
          </span>
          <span className="inline-flex min-h-[48px] items-center gap-2 rounded-[16px] border border-sky-300/10 bg-sky-400/8 px-3 py-2 text-sm text-slate-100">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-400/80 ring-4 ring-sky-400/10" />
            <span className="text-clarity">{t("today.expected", { amount: formatMl(status.expectedMl) })}</span>
          </span>
          <span className="inline-flex min-h-[48px] items-center gap-2 rounded-[16px] border border-emerald-300/10 bg-emerald-400/8 px-3 py-2 text-sm text-slate-100">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 ring-4 ring-emerald-400/10" />
            <span className="text-clarity">{t("today.actual", { amount: formatMl(status.actualIntakeMl) })}</span>
          </span>
          <span className="inline-flex min-h-[48px] items-center gap-2 rounded-[16px] border border-rose-300/10 bg-rose-400/8 px-3 py-2 text-sm text-slate-100">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-400 ring-4 ring-rose-400/10" />
            <span className="text-clarity">{t("today.debt", { amount: formatMl(status.debtMl) })}</span>
          </span>
          <span className="col-span-2 inline-flex min-h-[48px] items-center gap-2 rounded-[16px] border border-white/8 bg-white/4 px-3 py-2 text-sm text-slate-100">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300/70 ring-4 ring-white/6" />
            <span className="text-clarity">{t("today.remaining", { amount: formatMl(status.remainingMl) })}</span>
          </span>
        </div>
      </article>

      <article className="panel-surface rounded-[22px] p-4">
        <div className="mb-4">
          <div>
            <h2 className="m-0 text-lg font-semibold text-slate-50">{t("today.quickLog")}</h2>
            <p className="mt-1 text-sm text-slate-300/78">{t("today.quickLogHelp")}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[18px] border border-white/8 bg-white/4 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-slate-300/68">
                Amount
              </span>
              <div className="rounded-[16px] border border-white/8 bg-white/5 px-4 py-2 text-right">
                <span className="text-clarity text-[11px] uppercase tracking-[0.2em] text-slate-300/55">
                  Current
                </span>
                <div className="text-clarity text-2xl font-semibold leading-none text-slate-50">
                  {quickAmount}
                  <span className="ml-1 text-sm font-medium text-slate-300/80">ml</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
              <button
                onClick={() => setQuickAmount((value) => Math.max(cupStep, value - cupStep))}
                className="rounded-[14px] border border-white/8 bg-white/5 px-3 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/8"
              >
                <span className="text-clarity">-{cupStep} ml</span>
              </button>
              <button
                onClick={() => setQuickAmount(settings.cupSizeMl)}
                className="rounded-[14px] border border-white/8 bg-white/4 px-3 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/8"
              >
                <span className="text-clarity">{t("today.resetToCup")}</span>
              </button>
              <button
                onClick={() => setQuickAmount((value) => value + cupStep)}
                className="rounded-[14px] border border-white/8 bg-white/5 px-3 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/8"
              >
                <span className="text-clarity">+{cupStep} ml</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onLog(settings.cupSizeMl)}
              className="no-text-clarity rounded-[18px] bg-gradient-to-r from-sky-300 to-emerald-300 px-4 py-4 text-left text-slate-950 transition hover:brightness-105"
            >
              <span className="text-clarity block text-xs font-semibold uppercase tracking-[0.2em] text-slate-900/60">
                Default
              </span>
              <span className="text-clarity mt-2 block text-lg font-semibold leading-tight">
                {t("today.logOneCup", { amount: formatMl(settings.cupSizeMl) })}
              </span>
            </button>
            <button
              onClick={() => onLog(quickAmount)}
              className="rounded-[18px] border border-white/8 bg-white/5 px-4 py-4 text-left text-slate-50 transition hover:bg-white/8"
            >
              <span className="text-clarity block text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/62">
                Adjusted
              </span>
              <span className="text-clarity mt-2 block text-lg font-semibold leading-tight">
                {t("today.logAmount", { amount: formatMl(quickAmount) })}
              </span>
            </button>
          </div>

          <button
            onClick={onUndo}
            disabled={!status.canUndoLastDrink}
            className="w-full rounded-[16px] border border-rose-300/12 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-50 transition hover:bg-rose-400/14 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="text-clarity">
              {status.lastLoggedAmountMl
                ? t("today.undoAmount", {
                    amount: formatMl(status.lastLoggedAmountMl)
                  })
                : t("today.undoLastLog")}
            </span>
          </button>
        </div>
      </article>
    </section>
  );
}
