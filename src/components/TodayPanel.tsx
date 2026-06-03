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
  const { t, formatMl, formatDateTime } = useI18n();
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
      <article className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-[28px] font-bold leading-none text-slate-50">
                {t("today.title")}
              </h2>
              <div className="rounded-2xl py-2">
                <span className="mr-2 text-xs text-slate-300/70">
                  {t("today.nextReminder")}
                </span>
                <strong className="mt-1 text-base font-semibold text-slate-50">
                  {formatDateTime(status.nextReminderAt)}
                </strong>
              </div>
            </div>
            <div className="min-w-[88px] rounded-2xl bg-white/5 px-3 py-2 text-center">
              <span className="block text-xs text-slate-300/70">{t("today.progress")}</span>
              <strong className="mt-1 block text-3xl font-bold text-slate-50">
                {progressPercent}%
              </strong>
            </div>
          </div>
        </div>

        <div className="relative h-14 overflow-hidden rounded-full border border-white/10 bg-white/5">
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
              className="absolute inset-y-0 left-0 rounded-l-full rounded-r-none bg-gradient-to-r from-emerald-300 to-emerald-500 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
              style={{ width: `${actualWidth}%` }}
            />
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="inline-flex min-h-[48px] items-center gap-2 rounded-[16px] border border-white/8 bg-black/18 px-3 py-2 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white/35 ring-4 ring-white/6" />
            {t("today.target", { amount: formatMl(status.targetMl) })}
          </span>
          <span className="inline-flex min-h-[48px] items-center gap-2 rounded-[16px] border border-sky-300/10 bg-sky-400/8 px-3 py-2 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-400/80 ring-4 ring-sky-400/10" />
            {t("today.expected", { amount: formatMl(status.expectedMl) })}
          </span>
          <span className="inline-flex min-h-[48px] items-center gap-2 rounded-[16px] border border-emerald-300/10 bg-emerald-400/8 px-3 py-2 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 ring-4 ring-emerald-400/10" />
            {t("today.actual", { amount: formatMl(status.actualIntakeMl) })}
          </span>
          <span className="inline-flex min-h-[48px] items-center gap-2 rounded-[16px] border border-rose-300/10 bg-rose-400/8 px-3 py-2 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-400 ring-4 ring-rose-400/10" />
            {t("today.debt", { amount: formatMl(status.debtMl) })}
          </span>
          <span className="inline-flex min-h-[48px] items-center gap-2 rounded-[16px] border border-white/8 bg-white/6 px-3 py-2 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] col-span-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300/70 ring-4 ring-white/6" />
            {t("today.remaining", { amount: formatMl(status.remainingMl) })}
          </span>
        </div>
      </article>

      <article className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <div className="mb-4">
          <div>
            <h2 className="m-0 text-lg font-semibold text-slate-50">{t("today.quickLog")}</h2>
            <p className="mt-1 text-sm text-slate-300/78">{t("today.quickLogHelp")}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[18px] border border-white/8 bg-black/18 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-slate-300/68">
                Amount
              </span>
              <div className="rounded-[16px] bg-white/8 px-4 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-300/55">
                  Current
                </span>
                <div className="text-2xl font-semibold leading-none text-slate-50">
                  {quickAmount}
                  <span className="ml-1 text-sm font-medium text-slate-300/80">ml</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
              <button
                onClick={() => setQuickAmount((value) => Math.max(cupStep, value - cupStep))}
                className="rounded-[14px] bg-white/8 px-3 py-3 text-sm font-medium text-slate-100 transition hover:-translate-y-px hover:bg-white/14"
              >
                -{cupStep} ml
              </button>
              <button
                onClick={() => setQuickAmount(settings.cupSizeMl)}
                className="rounded-[14px] border border-white/10 bg-white/6 px-3 py-3 text-sm font-medium text-slate-200 transition hover:-translate-y-px hover:bg-white/12"
              >
                {t("today.resetToCup")}
              </button>
              <button
                onClick={() => setQuickAmount((value) => value + cupStep)}
                className="rounded-[14px] bg-white/8 px-3 py-3 text-sm font-medium text-slate-100 transition hover:-translate-y-px hover:bg-white/14"
              >
                +{cupStep} ml
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onLog(settings.cupSizeMl)}
              className="rounded-[18px] bg-gradient-to-r from-sky-300 to-emerald-300 px-4 py-4 text-left text-slate-950 shadow-[0_12px_30px_rgba(78,226,194,0.28)] transition hover:-translate-y-px"
            >
              <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-900/60">
                Default
              </span>
              <span className="mt-2 block text-lg font-semibold leading-tight">
                {t("today.logOneCup", { amount: formatMl(settings.cupSizeMl) })}
              </span>
            </button>
            <button
              onClick={() => onLog(quickAmount)}
              className="rounded-[18px] border border-white/10 bg-white/10 px-4 py-4 text-left text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:-translate-y-px hover:bg-white/14"
            >
              <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/62">
                Adjusted
              </span>
              <span className="mt-2 block text-lg font-semibold leading-tight">
                {t("today.logAmount", { amount: formatMl(quickAmount) })}
              </span>
            </button>
          </div>

          <button
            onClick={onUndo}
            disabled={!status.canUndoLastDrink}
            className="w-full rounded-[16px] border border-rose-300/12 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-50 transition hover:-translate-y-px hover:bg-rose-400/14 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            {status.lastLoggedAmountMl
              ? t("today.undoAmount", {
                  amount: formatMl(status.lastLoggedAmountMl)
                })
              : t("today.undoLastLog")}
          </button>
        </div>
      </article>
    </section>
  );
}
