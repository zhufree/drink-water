import type { HistoryItem } from "../../types";
import { useI18n } from "../../i18n";
import { buildHistoryGrid, getCellFillClass } from "./historyPanelData";

type RecentHistoryCardProps = {
  history: HistoryItem[];
};

export function RecentHistoryCard({ history }: RecentHistoryCardProps) {
  const { locale, formatShortDay } = useI18n();
  const cells = buildHistoryGrid(history, 56);
  const newestGridDay = cells[0]?.dayKey ?? "";
  const oldestGridDay = cells[cells.length - 1]?.dayKey ?? "";
  const title = locale === "zh-CN" ? "近两个月饮水" : "Last 8 weeks";
  const legends = locale === "zh-CN"
    ? [
        ["bg-emerald-400", "达标"],
        ["bg-sky-400", "接近达标"],
        ["bg-amber-500/80", "喝得偏少"],
        ["bg-rose-500/80", "喝得很少"]
      ]
    : [
        ["bg-emerald-400", "Goal met"],
        ["bg-sky-400", "Near goal"],
        ["bg-amber-500/80", "Below target"],
        ["bg-rose-500/80", "Far below target"]
      ];

  return (
    <div className="panel-surface rounded-[22px] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-lg font-semibold text-slate-50">{title}</h3>
          <p className="mt-2 text-sm text-slate-300/78">
            {formatShortDay(oldestGridDay)} - {formatShortDay(newestGridDay)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell) => {
          const percent = Math.round(cell.fillRatio * 100);
          const hasAmount = cell.actualIntakeMl > 0;
          return (
            <div
              key={cell.dayKey}
              title={`${cell.dayKey} · ${cell.actualIntakeMl} ml`}
              className="relative aspect-[1.05] overflow-hidden rounded-[6px] border border-white/8 bg-slate-950/22 text-[10px] text-slate-100"
            >
              <div
                className={`absolute inset-x-0 bottom-0 rounded-b-[6px] ${getCellFillClass(cell)}`}
                style={{ height: `${percent}%` }}
              />
              <span className="absolute left-1 top-1 font-semibold leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                {formatShortDay(cell.dayKey)}
              </span>
              {hasAmount ? (
                <span className="absolute bottom-1 left-1 right-1 truncate text-[10px] font-semibold leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                  {cell.actualIntakeMl}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200/82">
        {legends.map(([className, label]) => (
          <span key={label} className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2">
            <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
