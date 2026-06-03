import { useI18n } from "../../i18n";
import { PixelIcon } from "./PixelIcon";
import { getCropDefinitionBySeed } from "./historyPanelData";

type SourceEntry = {
  cropType: string;
  count: number;
  definition: {
    cropLabel: string;
    cropIcon: string;
  };
  options: Array<{
    sourceCropType: string;
    targetSeedType: string;
    cost: number;
  }>;
};

type SeedExchangeModalProps = {
  open: boolean;
  availableExchangeSources: SourceEntry[];
  selectedSourceEntry: SourceEntry | null;
  selectedTargetSeedType: string;
  selectedTargetOption:
    | {
        sourceCropType: string;
        targetSeedType: string;
        cost: number;
      }
    | null;
  canConfirmExchange: boolean;
  onClose: () => void;
  onSelectSource: (cropType: string) => void;
  onSelectTarget: (seedType: string) => void;
  onConfirmExchange: () => void;
};

export function SeedExchangeModal({
  open,
  availableExchangeSources,
  selectedSourceEntry,
  selectedTargetSeedType,
  selectedTargetOption,
  canConfirmExchange,
  onClose,
  onSelectSource,
  onSelectTarget,
  onConfirmExchange
}: SeedExchangeModalProps) {
  const { t } = useI18n();

  if (!open) {
    return null;
  }

  const targetOptions = selectedSourceEntry?.options ?? [];

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/72 p-4 backdrop-blur-sm">
      <div className="flex max-h-[min(88vh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(7,13,24,0.96)] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="m-0 text-xl font-semibold text-slate-50">{t("garden.exchangeTitle")}</h3>
            <p className="mt-1 text-sm text-slate-300/78">
              上面选择当前背包里有的果实，下面选择要兑换的种子。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col gap-2.5">
            <div className="rounded-[18px] bg-white/5 p-2.5">
              <div className="mb-3">
                <strong className="text-sm font-semibold text-slate-50">可用作物</strong>
                <p className="mt-1 text-xs text-slate-400">只显示当前真正拥有的果实库存</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {availableExchangeSources.map((entry) => {
                  const selected = entry.cropType === selectedSourceEntry?.cropType;
                  return (
                    <button
                      key={entry.cropType}
                      type="button"
                      title={entry.definition.cropLabel}
                      aria-label={`${entry.definition.cropLabel} x ${entry.count}`}
                      onClick={() => onSelectSource(entry.cropType)}
                    className={`flex min-h-[56px] items-center justify-between rounded-full border px-3 py-2 text-left transition ${
                        selected
                          ? "border-emerald-200/60 bg-emerald-300/15 text-emerald-50"
                          : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/8"
                      }`}
                    >
                      <PixelIcon src={entry.definition.cropIcon} size={30} />
                      <span className="text-sm tabular-nums">{`x ${entry.count}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[18px] bg-white/5 p-2.5">
              <div className="mb-3">
                <strong className="text-sm font-semibold text-slate-50">可兑换种子</strong>
                <p className="mt-1 text-xs text-slate-400">
                  按当前作物的等级，列出可以选择的目标种子
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {targetOptions.map((option) => {
                  const definition = getCropDefinitionBySeed(option.targetSeedType);
                  const selected = option.targetSeedType === selectedTargetSeedType;
                  return (
                    <button
                      key={option.targetSeedType}
                      type="button"
                      title={definition.seedLabel}
                      aria-label={`${definition.seedLabel} cost ${option.cost}`}
                      onClick={() => onSelectTarget(option.targetSeedType)}
                    className={`rounded-full border px-3 py-2 text-left transition ${
                        selected
                          ? "border-amber-200/70 bg-amber-200/12 text-amber-50"
                          : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/8"
                      }`}
                    >
                      <span className="flex min-h-[40px] items-center justify-between gap-2">
                        <PixelIcon src={definition.seedIcon} size={30} />
                        <span className="text-xs text-slate-300/78 tabular-nums">{`x1 / ${option.cost}`}</span>
                      </span>
                    </button>
                  );
                })}
                {targetOptions.length === 0 ? (
                  <div className="col-span-3 rounded-[14px] border border-dashed border-white/10 bg-white/4 px-3 py-4 text-sm text-slate-400">
                    这个作物暂时还没有可选的目标种子
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] bg-white/5 px-3 py-2.5">
          <div className="text-sm text-slate-300/82">
            {selectedSourceEntry && selectedTargetOption ? (
              <span className="inline-flex items-center gap-2">
                <PixelIcon src={selectedSourceEntry.definition.cropIcon} size={24} />
                <span className="tabular-nums">x {selectedTargetOption.cost}</span>
                <span>→</span>
                <PixelIcon
                  src={getCropDefinitionBySeed(selectedTargetOption.targetSeedType).seedIcon}
                  size={24}
                />
                <span className="tabular-nums">x 1</span>
              </span>
            ) : (
              <span>请先选择上面和下面的兑换对象</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[14px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmExchange}
              disabled={!canConfirmExchange}
              className={`rounded-[14px] px-4 py-2 text-sm font-semibold transition ${
                canConfirmExchange
                  ? "bg-amber-200 text-slate-950 hover:-translate-y-px hover:bg-amber-100"
                  : "cursor-not-allowed bg-white/10 text-slate-400"
              }`}
            >
              {t("garden.exchangeAction")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
