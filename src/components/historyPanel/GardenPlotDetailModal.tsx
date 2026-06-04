import { createPortal } from "react-dom";
import type { HistoryCell } from "./historyPanelData";
import type { PlantedCrop } from "../../types";
import { useI18n } from "../../i18n";
import { PixelIcon } from "./PixelIcon";
import { getCropDefinitionBySeed } from "./historyPanelData";

type GardenPlotDetailModalProps = {
  open: boolean;
  cell: HistoryCell | null;
  crop: PlantedCrop | undefined;
  growthPercent: number;
  growthStage: number;
  mature: boolean;
  selectedSeedLabel: string;
  canPlant: boolean;
  canHarvest: boolean;
  onClose: () => void;
  onPlant: () => void;
  onHarvest: () => void;
};

export function GardenPlotDetailModal({
  open,
  cell,
  crop,
  growthPercent,
  growthStage,
  mature,
  selectedSeedLabel,
  canPlant,
  canHarvest,
  onClose,
  onPlant,
  onHarvest
}: GardenPlotDetailModalProps) {
  const { formatMl, formatShortDay } = useI18n();

  if (!open || !cell) {
    return null;
  }

  const definition = crop ? getCropDefinitionBySeed(crop.seedType) : null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/72 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[rgba(7,13,24,0.94)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-medium text-cyan-200">格子详情</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-50">{formatShortDay(cell.dayKey)}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
          >
            ×
          </button>
        </div>

        <div className="mt-4 rounded-[20px] border border-white/8 bg-white/5 p-4">
          <p className="m-0 text-sm text-slate-300/70">当天饮水</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/6 px-3 py-2 text-sm text-slate-100">
              实际 {formatMl(cell.actualIntakeMl)}
            </span>
            <span className="rounded-full bg-white/6 px-3 py-2 text-sm text-slate-100">
              目标 {formatMl(cell.targetMl)}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-[20px] border border-white/8 bg-white/5 p-4">
          <p className="m-0 text-sm text-slate-300/70">作物状态</p>
          {definition ? (
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-white/6">
                <PixelIcon src={definition.cropIcon} size={28} />
              </span>
              <div className="min-w-0">
                <p className="m-0 text-base font-semibold text-slate-50">{definition.cropLabel}</p>
                <p className="mt-1 text-sm text-slate-300/78">第 {growthStage + 1} / 4 阶段</p>
                <p className="mt-1 text-sm text-slate-300/78">
                  {mature ? "已经成熟，可收获" : `成长 ${growthPercent}%`}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-300/78">这个格子还没有种作物。</p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[14px] border border-white/12 bg-white/6 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            关闭
          </button>
          {canPlant ? (
            <button
              type="button"
              onClick={onPlant}
              className="rounded-[14px] border border-emerald-200/30 bg-emerald-300/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:-translate-y-px hover:bg-emerald-300/16"
            >
              播种 {selectedSeedLabel}
            </button>
          ) : null}
          {canHarvest ? (
            <button
              type="button"
              onClick={onHarvest}
              className="rounded-[14px] border border-amber-200/30 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:-translate-y-px hover:bg-amber-300/16"
            >
              立即收获
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
