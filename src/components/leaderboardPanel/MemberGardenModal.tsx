import { useMemo } from "react";
import { Trash2, X } from "lucide-react";
import type { GardenState, HistoryItem, PlantedCrop } from "../../types";
import { useI18n } from "../../i18n";
import { PixelIcon } from "../historyPanel/PixelIcon";
import {
  buildHistoryGrid,
  getCropDefinitionBySeed
} from "../historyPanel/historyPanelData";

type MemberGardenModalProps = {
  open: boolean;
  displayName: string;
  loading: boolean;
  error: string | null;
  history: HistoryItem[];
  garden: GardenState | null;
  canRemove: boolean;
  onClose: () => void;
  onRemove: () => void;
};

export function MemberGardenModal({
  open,
  displayName,
  loading,
  error,
  history,
  garden,
  canRemove,
  onClose,
  onRemove
}: MemberGardenModalProps) {
  const { t, formatShortDay } = useI18n();
  const gridCells = useMemo(() => buildHistoryGrid(history, 28, 0), [history]);
  const cropsByDay = useMemo(
    () =>
      new Map(
        (garden?.crops ?? [])
          .filter((crop) => !crop.harvestedAt)
          .map((crop) => [crop.dayKey, crop])
      ),
    [garden?.crops]
  );
  const harvestCount =
    garden?.collection.reduce((total, item) => total + item.harvestCount, 0) ?? 0;
  const activeCropCount = cropsByDay.size;
  const newestGridDay = gridCells[0]?.dayKey ?? "";
  const oldestGridDay = gridCells[gridCells.length - 1]?.dayKey ?? "";

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/72 p-4 backdrop-blur-sm">
      <div className="flex max-h-[min(86vh,760px)] w-full max-w-[520px] flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(7,13,24,0.96)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="m-0 text-xl font-semibold text-slate-50">
              {t("leaderboard.memberGardenTitle", { name: displayName })}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300/80">
              {t("leaderboard.memberGardenDescription")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("leaderboard.actionClose")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
          >
            <X className="h-4 w-4" strokeWidth={2.1} />
          </button>
        </div>

        <div className="mt-4 min-h-0 overflow-y-auto pr-1">
          {loading ? (
            <div className="rounded-[18px] bg-white/5 px-4 py-8 text-center text-sm text-slate-300/76">
              {t("leaderboard.memberGardenLoading")}
            </div>
          ) : error ? (
            <div className="rounded-[18px] bg-amber-300/10 px-4 py-8 text-center text-sm text-amber-100">
              {error}
            </div>
          ) : garden ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div className="rounded-[16px] bg-amber-300/10 px-3 py-2">
                  <span className="block text-[11px] text-amber-100/80">
                    {t("garden.harvested")}
                  </span>
                  <strong className="mt-1 block text-lg text-amber-50">
                    {t("garden.harvestCount", { count: harvestCount })}
                  </strong>
                </div>
                <div className="rounded-[16px] bg-sky-300/10 px-3 py-2">
                  <span className="block text-[11px] text-sky-100/80">
                    {t("leaderboard.memberGardenActiveCrops")}
                  </span>
                  <strong className="mt-1 block text-lg text-sky-50">
                    {t("garden.plotCount", { count: activeCropCount })}
                  </strong>
                </div>
              </div>

              <div className="mb-3 flex items-center justify-between text-[11px] text-slate-400">
                <span>{t("history.newestFirst", { day: formatShortDay(newestGridDay) })}</span>
                <span>{t("history.oldestLast", { day: formatShortDay(oldestGridDay) })}</span>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {gridCells.map((cell) => {
                  const crop = cropsByDay.get(cell.dayKey);
                  const plantedDefinition = crop
                    ? getCropDefinitionBySeed(crop.seedType)
                    : null;

                  return (
                    <div
                      key={cell.dayKey}
                      title={buildPlotTitle(cell.dayKey, crop)}
                      className={`relative aspect-square overflow-hidden rounded-[5px] border border-white/8 text-[10px] ${
                        crop ? "bg-emerald-300/10" : "bg-white/4"
                      }`}
                    >
                      {crop && plantedDefinition ? (
                        <div className="absolute inset-0 grid place-items-center">
                          <span className="grid h-10 w-10 place-items-center">
                            <PixelIcon src={plantedDefinition.cropIcon} size={40} />
                          </span>
                          <span className="absolute bottom-0.5 right-0.5 rounded-full bg-slate-950/70 p-[2px]">
                            <PixelIcon src={plantedDefinition.cropIcon} size={10} />
                          </span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="rounded-[18px] bg-white/5 px-4 py-8 text-center text-sm text-slate-300/76">
              {t("leaderboard.memberGardenEmpty")}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          {canRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-2 rounded-[14px] border border-rose-200/30 bg-rose-300/10 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:-translate-y-px hover:bg-rose-300/16"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2} />
              {t("leaderboard.memberGardenRemove")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-[14px] border border-white/12 bg-white/6 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            {t("leaderboard.actionClose")}
          </button>
        </div>
      </div>
    </div>
  );

  function buildPlotTitle(dayKey: string, crop: PlantedCrop | undefined) {
    if (!crop) {
      return dayKey;
    }
    const definition = getCropDefinitionBySeed(crop.seedType);
    return `${dayKey} | ${definition.cropLabel}`;
  }
}
