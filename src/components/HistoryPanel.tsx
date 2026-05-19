import type { HistoryItem } from "../types";
import { formatMl } from "../utils";

type HistoryPanelProps = {
  history: HistoryItem[];
};

type HistoryCell = HistoryItem & {
  fillRatio: number;
};

function parseDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatShortDay(dayKey: string) {
  return parseDayKey(dayKey).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric"
  });
}

function buildHistoryGrid(history: HistoryItem[], days = 56) {
  const map = new Map(history.map((item) => [item.dayKey, item]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: HistoryCell[] = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const dayKey = date.toISOString().slice(0, 10);
    const entry = map.get(dayKey);

    if (entry) {
      const fillRatio =
        entry.targetMl > 0
          ? Math.min(1, entry.actualIntakeMl / entry.targetMl)
          : 0;
      cells.push({ ...entry, fillRatio });
    } else {
      cells.push({
        dayKey,
        targetMl: 0,
        actualIntakeMl: 0,
        consumedMl: 0,
        debtIncurredMl: 0,
        goalMet: false,
        completedReminderSlots: 0,
        missedReminderSlots: 0,
        fillRatio: 0
      });
    }
  }

  return cells;
}

function getCellClass(cell: HistoryCell) {
  if (cell.targetMl <= 0 || cell.actualIntakeMl <= 0) {
    return "bg-white/6 border border-white/6";
  }

  if (cell.goalMet) {
    if (cell.fillRatio >= 1) {
      return "bg-emerald-400 border border-emerald-300/70";
    }
    return "bg-emerald-500/80 border border-emerald-300/60";
  }

  if (cell.fillRatio >= 0.7) {
    return "bg-sky-400 border border-sky-300/70";
  }

  if (cell.fillRatio >= 0.4) {
    return "bg-cyan-500/70 border border-cyan-300/60";
  }

  if (cell.fillRatio >= 0.2) {
    return "bg-amber-500/70 border border-amber-300/60";
  }

  return "bg-rose-500/70 border border-rose-300/60";
}

export function HistoryPanel({ history }: HistoryPanelProps) {
  const gridCells = buildHistoryGrid(history, 56);
  const recentItems = [...history]
    .sort((left, right) => right.dayKey.localeCompare(left.dayKey))
    .slice(0, 7);

  return (
    <section className="flex flex-col gap-3">
      <div className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <h2 className="m-0 text-lg font-semibold text-slate-50">饮水历史</h2>
        <p className="mt-1 text-sm text-slate-300/78">
          用格子的颜色看每天喝水情况，颜色越健康，说明越接近或达到目标。
        </p>
      </div>

      <article className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="m-0 text-lg font-semibold text-slate-50">近 8 周热力格</h3>
            <p className="mt-1 text-sm text-slate-300/78">
              绿色代表达标，蓝色代表喝得不错，暖色代表喝得偏少。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-14 gap-2">
          {gridCells.map((cell) => (
            <div
              key={cell.dayKey}
              title={`${cell.dayKey} · 实际 ${formatMl(cell.actualIntakeMl)}${cell.targetMl > 0 ? ` / 目标 ${formatMl(cell.targetMl)}` : ""}`}
              className={`aspect-square rounded-[5px] ${getCellClass(cell)}`}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200/82">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            达标
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            接近达标
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            喝得偏少
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            喝得很少
          </span>
        </div>
      </article>

      <div className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <h3 className="m-0 text-lg font-semibold text-slate-50">最近 7 天明细</h3>
        <div className="mt-4 flex flex-col gap-2">
          {recentItems.map((item) => (
            <article
              key={item.dayKey}
              className="flex flex-col gap-2 rounded-[18px] bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <strong className="text-sm font-semibold text-slate-50">
                  {formatShortDay(item.dayKey)}
                </strong>
                <p className="mt-1 text-sm text-slate-300/78">
                  实际 {formatMl(item.actualIntakeMl)} / 净完成 {formatMl(item.consumedMl)}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="block text-sm text-slate-300/78">
                  {item.goalMet ? "已达标" : "未达标"}
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  欠量累计 {formatMl(item.debtIncurredMl)}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
