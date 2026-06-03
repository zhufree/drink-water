import type { HistoryItem, PlantedCrop } from "../../types";
import { useI18n } from "../../i18n";
import { PixelIcon } from "./PixelIcon";
import {
  type HistoryCell,
  getCellFillClass,
  getCropDefinitionBySeed,
  getCropGrowth
} from "./historyPanelData";

type HistoryHeatmapCardProps = {
  gridCells: HistoryCell[];
  history: HistoryItem[];
  cropsByDay: Map<string, PlantedCrop>;
  selectableSeeds: Array<[string, number]>;
  selectedSeedType: string;
  selectedSeedCount: number;
  harvestCount: number;
  plantableCount: number;
  onSelectSeed: (seedType: string) => void;
  onPlantSeed: (dayKey: string, seedType: string) => void;
  onHarvestCrop: (dayKey: string) => void;
};

export function HistoryHeatmapCard({
  gridCells,
  history,
  cropsByDay,
  selectableSeeds,
  selectedSeedType,
  selectedSeedCount,
  harvestCount,
  plantableCount,
  onSelectSeed,
  onPlantSeed,
  onHarvestCrop
}: HistoryHeatmapCardProps) {
  const { t, formatMl, formatShortDay } = useI18n();
  const newestGridDay = gridCells[0]?.dayKey ?? "";
  const oldestGridDay = gridCells[gridCells.length - 1]?.dayKey ?? "";
  const selectedDefinition = getCropDefinitionBySeed(selectedSeedType);

  return (
    <article className="panel-surface rounded-[22px] p-4">
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
            {t("garden.seedCount", {
              count: selectableSeeds.reduce((total, [, count]) => total + count, 0)
            })}
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

      <div className="mb-3 rounded-[16px] border border-white/8 bg-white/4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-300/78">当前播种：</span>
          {selectableSeeds.length > 0 ? (
            selectableSeeds.map(([seedType, count]) => {
              const selected = seedType === selectedSeedType;
              const definition = getCropDefinitionBySeed(seedType);
              return (
                <button
                  key={seedType}
                  type="button"
                  title={definition.seedLabel}
                  aria-label={`${definition.seedLabel} x ${count}`}
                  onClick={() => onSelectSeed(seedType)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                    selected
                      ? "border-emerald-200/70 bg-emerald-300/18 text-emerald-50"
                      : "border-white/8 bg-white/4 text-slate-200 hover:border-white/12 hover:bg-white/7"
                  }`}
                >
                  <PixelIcon src={definition.seedIcon} size={30} />
                  <span className="tabular-nums">x {count}</span>
                </button>
              );
            })
          ) : (
            <span className="rounded-full bg-white/5 px-3 py-2 text-sm text-slate-300/78">
              {t("garden.noSeeds")}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {gridCells.map((cell) => {
          const crop = cropsByDay.get(cell.dayKey);
          const cropGrowth = getCropGrowth(cell, crop);
          const canPlant = cell.actualIntakeMl > 0 && !crop && selectedSeedCount > 0;
          const canHarvest = Boolean(crop && cropGrowth.mature);
          const planted = Boolean(crop);
          const plantedDefinition = crop
            ? getCropDefinitionBySeed(crop.seedType)
            : selectedDefinition;
          const actionLabel = canHarvest
            ? t("garden.readyToHarvest")
            : planted
              ? t("garden.growing", { percent: cropGrowth.growthPercent })
              : canPlant
                ? `${t("garden.plantAction")} ${selectedDefinition.seedLabel}`
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
                target: cell.targetMl > 0 ? ` / ${formatMl(cell.targetMl)}` : ""
              })} | ${actionLabel}`}
              onClick={() => {
                if (canHarvest) {
                  onHarvestCrop(cell.dayKey);
                  return;
                }
                if (canPlant) {
                  onPlantSeed(cell.dayKey, selectedSeedType);
                }
              }}
              disabled={!canPlant && !canHarvest}
              className={`relative aspect-square overflow-hidden rounded-[5px] border border-white/8 bg-white/4 text-[10px] transition ${
                canPlant || canHarvest
                  ? "cursor-pointer hover:border-emerald-200/60"
                  : "cursor-default"
              }`}
            >
              <div
                className={`absolute inset-x-0 bottom-0 rounded-b-[5px] ${getCellFillClass(cell)}`}
                style={{ height: `${Math.round(cell.fillRatio * 100)}%` }}
              />
              {crop ? (
                <div className="absolute inset-0 grid place-items-center">
                  <span className="grid h-5 w-5 place-items-center">
                    <PixelIcon src={plantedDefinition.cropIcon} size={18} />
                  </span>
                </div>
              ) : null}
              {canHarvest ? (
                <span className="absolute left-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-lime-200 shadow-[0_0_8px_rgba(190,242,100,0.8)]" />
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
  );
}
