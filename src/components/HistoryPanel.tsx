import { useI18n } from "../i18n";
import type { GardenState, HistoryItem, PlantedCrop } from "../types";

type HistoryPanelProps = {
  history: HistoryItem[];
  gardenState: GardenState;
  onPlantSeed: (dayKey: string) => void;
  onHarvestCrop: (dayKey: string) => void;
};

type HistoryCell = HistoryItem & {
  fillRatio: number;
};

const BASIC_SEED_TYPE = "bokChoy";
const DAY_MS = 24 * 60 * 60 * 1000;

function buildHistoryGrid(history: HistoryItem[], days = 56) {
  const map = new Map(history.map((item) => [item.dayKey, item]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: HistoryCell[] = [];
  for (let index = 0; index < days; index += 1) {
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

function getCellFillClass(cell: HistoryCell) {
  if (cell.targetMl <= 0 || cell.actualIntakeMl <= 0) {
    return "bg-transparent";
  }

  if (cell.goalMet) {
    if (cell.fillRatio >= 1) {
      return "bg-emerald-400";
    }
    return "bg-emerald-500/80";
  }

  if (cell.fillRatio >= 0.7) {
    return "bg-sky-400";
  }

  if (cell.fillRatio >= 0.4) {
    return "bg-cyan-500/70";
  }

  if (cell.fillRatio >= 0.2) {
    return "bg-amber-500/70";
  }

  return "bg-rose-500/70";
}

function getRequiredGrowthDays(cell: HistoryCell) {
  if (cell.actualIntakeMl <= 0) {
    return 0;
  }

  if (cell.targetMl <= 0) {
    return 1;
  }

  const completionPercent = Math.floor((cell.actualIntakeMl / cell.targetMl) * 100);
  if (completionPercent >= 100) {
    return 1;
  }

  if (completionPercent >= 70) {
    return 2;
  }

  if (completionPercent >= 40) {
    return 3;
  }

  return 4;
}

function getCropGrowth(cell: HistoryCell, crop: PlantedCrop | undefined) {
  if (!crop) {
    return {
      requiredDays: getRequiredGrowthDays(cell),
      growthPercent: 0,
      mature: false
    };
  }

  const requiredDays = getRequiredGrowthDays(cell);
  if (requiredDays <= 0) {
    return { requiredDays, growthPercent: 0, mature: false };
  }

  const plantedTime = new Date(crop.plantedAt).getTime();
  const elapsedMs = Number.isNaN(plantedTime) ? 0 : Math.max(0, Date.now() - plantedTime);
  const growthPercent = Math.min(100, Math.floor((elapsedMs / (requiredDays * DAY_MS)) * 100));
  return {
    requiredDays,
    growthPercent,
    mature: growthPercent >= 100
  };
}

function getSeedLabel(seedType: string) {
  if (seedType === BASIC_SEED_TYPE) {
    return "小青菜";
  }

  return seedType;
}

export function HistoryPanel({
  history,
  gardenState,
  onPlantSeed,
  onHarvestCrop
}: HistoryPanelProps) {
  const { t, formatMl, formatShortDay } = useI18n();
  const gridCells = buildHistoryGrid(history, 56);
  const activeCrops = gardenState.crops.filter((crop) => !crop.harvestedAt);
  const cropsByDay = new Map(activeCrops.map((crop) => [crop.dayKey, crop]));
  const basicSeedCount =
    gardenState.seeds.find((seed) => seed.seedType === BASIC_SEED_TYPE)?.count ?? 0;
  const harvestCount = gardenState.collection.reduce(
    (total, item) => total + item.harvestCount,
    0
  );
  const plantableCount = gridCells.filter(
    (cell) => cell.actualIntakeMl > 0 && !cropsByDay.has(cell.dayKey)
  ).length;
  const newestGridDay = gridCells[0]?.dayKey ?? "";
  const oldestGridDay = gridCells[gridCells.length - 1]?.dayKey ?? "";
  const recentItems = [...history]
    .sort((left, right) => right.dayKey.localeCompare(left.dayKey))
    .slice(0, 7);

  return (
    <section className="flex flex-col gap-3">
      <div className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <h2 className="m-0 text-lg font-semibold text-slate-50">{t("history.title")}</h2>
        <p className="mt-1 text-sm text-slate-300/78">{t("history.description")}</p>
      </div>

      <article className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="m-0 text-lg font-semibold text-slate-50">{t("history.heatmapTitle")}</h3>
            <p className="mt-1 text-sm text-slate-300/78">{t("history.heatmapDescription")}</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-[16px] bg-emerald-300/10 px-3 py-2">
            <span className="block text-[11px] text-emerald-100/80">{t("garden.seedStock")}</span>
            <strong className="mt-1 block text-lg text-emerald-50">
              {t("garden.seedCount", { count: basicSeedCount })}
            </strong>
          </div>
          <div className="rounded-[16px] bg-amber-300/10 px-3 py-2">
            <span className="block text-[11px] text-amber-100/80">{t("garden.harvested")}</span>
            <strong className="mt-1 block text-lg text-amber-50">
              {t("garden.harvestCount", { count: harvestCount })}
            </strong>
          </div>
          <div className="rounded-[16px] bg-sky-300/10 px-3 py-2">
            <span className="block text-[11px] text-sky-100/80">{t("garden.plantable")}</span>
            <strong className="mt-1 block text-lg text-sky-50">
              {t("garden.plotCount", { count: plantableCount })}
            </strong>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>{t("history.newestFirst", { day: formatShortDay(newestGridDay) })}</span>
          <span>{t("history.oldestLast", { day: formatShortDay(oldestGridDay) })}</span>
        </div>

        <div className="grid grid-cols-14 gap-2">
          {gridCells.map((cell) => {
            const crop = cropsByDay.get(cell.dayKey);
            const cropGrowth = getCropGrowth(cell, crop);
            const canPlant = cell.actualIntakeMl > 0 && !crop && basicSeedCount > 0;
            const canHarvest = Boolean(crop && cropGrowth.mature);
            const planted = Boolean(crop);
            const actionLabel = canHarvest
                ? t("garden.readyToHarvest")
                : planted
                  ? t("garden.growing", { percent: cropGrowth.growthPercent })
                  : canPlant
                    ? t("garden.plantAction")
                    : cell.actualIntakeMl > 0
                      ? t("garden.noSeeds")
                      : t("garden.emptyPlot");

            return (
              <button
                key={cell.dayKey}
                type="button"
                title={`${t("history.tooltip", {
                  day: cell.dayKey,
                  actual: formatMl(cell.actualIntakeMl),
                  target:
                    cell.targetMl > 0 ? ` / ${formatMl(cell.targetMl)}` : ""
                })} | ${actionLabel}`}
                onClick={() => {
                  if (canHarvest) {
                    onHarvestCrop(cell.dayKey);
                    return;
                  }

                  if (canPlant) {
                    onPlantSeed(cell.dayKey);
                  }
                }}
                disabled={!canPlant && !canHarvest}
                className={`relative aspect-square overflow-hidden rounded-[5px] border border-white/8 bg-white/6 text-[10px] transition ${
                  canPlant || canHarvest
                    ? "cursor-pointer hover:-translate-y-0.5 hover:border-emerald-200/60"
                    : "cursor-default"
                }`}
              >
                <div
                  className={`absolute inset-x-0 bottom-0 rounded-b-[5px] ${getCellFillClass(cell)}`}
                  style={{
                    height: `${Math.round(cell.fillRatio * 100)}%`
                  }}
                />
                {crop ? (
                  <div className="absolute inset-0 grid place-items-center">
                    <span
                      className={`grid h-4 w-4 place-items-center rounded-full text-[10px] shadow-[0_4px_10px_rgba(0,0,0,0.3)] ${
                        canHarvest
                            ? "bg-lime-200 text-lime-950"
                            : "bg-emerald-900/85 text-emerald-100"
                      }`}
                    >
                      {canHarvest ? "🥬" : "🌱"}
                    </span>
                  </div>
                ) : null}
                {canPlant ? (
                  <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-200" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200/82">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            {t("history.goalMet")}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            {t("history.nearGoal")}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            {t("history.low")}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            {t("history.veryLow")}
          </span>
        </div>
      </article>

      <article className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <h3 className="m-0 text-lg font-semibold text-slate-50">{t("garden.collectionTitle")}</h3>
        <p className="mt-1 text-sm text-slate-300/78">{t("garden.collectionDescription")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {gardenState.collection.length > 0 ? (
            gardenState.collection.map((item) => (
              <span
                key={item.cropType}
                className="inline-flex items-center gap-2 rounded-full bg-white/7 px-3 py-2 text-sm text-slate-100"
              >
                <span>🥬</span>
                {getSeedLabel(item.cropType)} × {item.harvestCount}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-white/5 px-3 py-2 text-sm text-slate-300/78">
              {t("garden.collectionEmpty")}
            </span>
          )}
        </div>
      </article>

      <div className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <h3 className="m-0 text-lg font-semibold text-slate-50">{t("history.recentTitle")}</h3>
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
    </section>
  );
}
