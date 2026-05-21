import { useI18n } from "../i18n";
import type { HistoryItem } from "../types";

type StartupCatchUpModalProps = {
  historyItem: HistoryItem;
  amountMl: number;
  onChangeAmount: (updater: number | ((value: number) => number)) => void;
  onDismiss: () => void;
  onConfirm: () => void;
};

export function StartupCatchUpModal({
  historyItem,
  amountMl,
  onChangeAmount,
  onDismiss,
  onConfirm
}: StartupCatchUpModalProps) {
  const { t, formatMl, formatShortDay } = useI18n();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[rgba(7,13,24,0.94)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <p className="m-0 text-sm font-medium text-cyan-200">
          {t("startupCatchUp.badge")}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-50">
          {t("startupCatchUp.title")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300/82">
          {t("startupCatchUp.description", {
            day: formatShortDay(historyItem.dayKey)
          })}
        </p>

        <div className="mt-4 rounded-[20px] border border-white/8 bg-white/5 p-4">
          <p className="m-0 text-sm text-slate-300/70">
            {t("startupCatchUp.yesterdaySummary")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/6 px-3 py-2 text-sm text-slate-100">
              {t("startupCatchUp.actual", {
                amount: formatMl(historyItem.actualIntakeMl)
              })}
            </span>
            <span className="rounded-full bg-white/6 px-3 py-2 text-sm text-slate-100">
              {t("startupCatchUp.target", {
                amount: formatMl(historyItem.targetMl)
              })}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-[20px] border border-white/8 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="m-0 text-sm font-semibold text-slate-50">
                {t("startupCatchUp.amountTitle")}
              </p>
              <p className="mt-1 text-xs text-slate-300/68">
                {t("startupCatchUp.amountHelp")}
              </p>
            </div>
            <div className="rounded-full bg-cyan-300/12 px-3 py-2 text-sm font-semibold text-cyan-100">
              {formatMl(amountMl)}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => onChangeAmount((value) => Math.max(50, value - 50))}
              className="rounded-[14px] bg-white/8 px-3 py-2 text-sm text-slate-100 transition hover:-translate-y-px hover:bg-white/14"
            >
              -50 ml
            </button>
            <button
              onClick={() => onChangeAmount((value) => value + 50)}
              className="rounded-[14px] bg-white/8 px-3 py-2 text-sm text-slate-100 transition hover:-translate-y-px hover:bg-white/14"
            >
              +50 ml
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            onClick={onDismiss}
            className="rounded-[14px] bg-white/8 px-4 py-3 text-sm font-medium text-slate-100 transition hover:-translate-y-px hover:bg-white/14"
          >
            {t("startupCatchUp.dismiss")}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-[14px] bg-gradient-to-r from-sky-300 to-emerald-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-px"
          >
            {t("startupCatchUp.confirm", { amount: formatMl(amountMl) })}
          </button>
        </div>
      </div>
    </div>
  );
}
