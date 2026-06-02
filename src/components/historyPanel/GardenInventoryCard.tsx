import { useI18n } from "../../i18n";
import { PixelIcon } from "./PixelIcon";
import { getCropDefinitionByCrop, getCropDefinitionBySeed } from "./historyPanelData";

type GardenInventoryCardProps = {
  seedEntries: Array<[string, number]>;
  produceEntries: Array<[string, number]>;
  totalSeedCount: number;
  totalProduceCount: number;
  canOpenExchange: boolean;
  onOpenExchange: () => void;
};

export function GardenInventoryCard({
  seedEntries,
  produceEntries,
  totalSeedCount,
  totalProduceCount,
  canOpenExchange,
  onOpenExchange
}: GardenInventoryCardProps) {
  const { t } = useI18n();

  return (
    <article className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-lg font-semibold text-slate-50">{t("garden.inventoryTitle")}</h3>
          <p className="mt-1 text-sm text-slate-300/78">{t("garden.inventoryDescription")}</p>
        </div>
        <button
          type="button"
          onClick={onOpenExchange}
          disabled={!canOpenExchange}
          className={`rounded-[14px] px-3 py-2 text-sm font-semibold transition ${
            canOpenExchange
              ? "bg-amber-200 text-slate-950 hover:-translate-y-px hover:bg-amber-100"
              : "cursor-not-allowed bg-white/10 text-slate-400"
          }`}
        >
          {t("garden.exchangeTitle")}
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[18px] bg-white/5 p-3">
          <div className="mb-3 flex items-center justify-between">
            <strong className="text-sm font-semibold text-slate-100">Seeds</strong>
            <span className="text-xs text-slate-400">{totalSeedCount}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {seedEntries.map(([seedType, count]) => {
              const definition = getCropDefinitionBySeed(seedType);
              return (
                <span
                  key={seedType}
                  className="inline-flex items-center gap-2 rounded-full bg-white/7 px-3 py-2 text-sm text-slate-100"
                >
                  <PixelIcon src={definition.seedIcon} size={26} />
                  {definition.seedLabel} x {count}
                </span>
              );
            })}
            {seedEntries.length === 0 ? (
              <span className="rounded-full bg-white/5 px-3 py-2 text-sm text-slate-300/78">
                {t("garden.noSeeds")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="rounded-[18px] bg-white/5 p-3">
          <div className="mb-3 flex items-center justify-between">
            <strong className="text-sm font-semibold text-slate-100">Produce</strong>
            <span className="text-xs text-slate-400">{totalProduceCount}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {produceEntries.map(([cropType, count]) => {
              const definition = getCropDefinitionByCrop(cropType);
              return (
                <span
                  key={cropType}
                  className="inline-flex items-center gap-2 rounded-full bg-white/7 px-3 py-2 text-sm text-slate-100"
                >
                  <PixelIcon src={definition.cropIcon} size={26} />
                  {definition.cropLabel} x {count}
                </span>
              );
            })}
            {produceEntries.length === 0 ? (
              <span className="rounded-full bg-white/5 px-3 py-2 text-sm text-slate-300/78">
                {t("garden.produceEmpty")}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
