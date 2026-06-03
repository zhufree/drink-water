import type { HistoryItem } from "../../types";
import { useI18n } from "../../i18n";

type RecentHistoryCardProps = {
  recentItems: HistoryItem[];
};

export function RecentHistoryCard({ recentItems }: RecentHistoryCardProps) {
  const { t, formatMl, formatShortDay } = useI18n();

  return (
    <div className="panel-surface rounded-[22px] p-4">
      <h3 className="m-0 text-lg font-semibold text-slate-50">{t("history.recentTitle")}</h3>
      <div className="mt-4 flex flex-col gap-2">
        {recentItems.map((item) => (
          <article
            key={item.dayKey}
            className="flex flex-col gap-2 rounded-[18px] border border-white/8 bg-white/4 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <strong className="text-sm font-semibold text-slate-50">
                {formatShortDay(item.dayKey)}
              </strong>
              <p className="mt-1 text-sm text-slate-300/78">
                {t("history.recentAmounts", {
                  actual: formatMl(item.actualIntakeMl),
                  consumed: formatMl(item.consumedMl)
                })}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="block text-sm text-slate-300/78">
                {item.goalMet ? t("history.met") : t("history.notMet")}
              </span>
              <span className="mt-1 block text-xs text-slate-400">
                {t("history.shortfall", {
                  amount: formatMl(Math.max(0, item.targetMl - item.actualIntakeMl))
                })}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
