import { useI18n } from "../../i18n";
import { PixelIcon } from "./PixelIcon";
import { getCropDefinitionByCrop, getCropDefinitionBySeed } from "./historyPanelData";

type GardenInventoryCardProps = {
  seedEntries: Array<[string, number]>;
  produceEntries: Array<[string, number]>;
  totalSeedCount: number;
  totalProduceCount: number;
  onOpenExchange: () => void;
};

export function GardenInventoryCard({
  seedEntries,
  produceEntries,
  totalSeedCount,
  totalProduceCount,
  onOpenExchange
}: GardenInventoryCardProps) {
  const { t } = useI18n();

  return (
    <article className="panel-surface rounded-[22px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-lg font-semibold text-slate-50">{t("garden.inventoryTitle")}</h3>
          <p className="mt-1 text-sm text-slate-300/78">{t("garden.inventoryDescription")}</p>
        </div>
        <button
          type="button"
          onClick={onOpenExchange}
          className="no-text-clarity rounded-[14px] bg-amber-200 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-100"
        >
          {t("garden.exchangeHub")}
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[18px] bg-white/5 p-3">
          <div className="mb-3 flex items-center justify-between">
            <strong className="text-sm font-semibold text-slate-100">{t("garden.inventorySeeds")}</strong>
            <span className="text-xs text-slate-400">{totalSeedCount}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {seedEntries.map(([seedType, count]) => {
              const definition = getCropDefinitionBySeed(seedType);
              return (
                <span
                  key={seedType}
                  title={definition.seedLabel}
                  aria-label={`${definition.seedLabel} x ${count}`}
                  className="inline-flex items-center gap-2 rounded-full bg-white/7 px-3 py-2 text-sm text-slate-100"
                >
                  <PixelIcon src={definition.seedIcon} size={30} />
                  <span className="tabular-nums">x {count}</span>
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
            <strong className="text-sm font-semibold text-slate-100">{t("garden.inventoryProduce")}</strong>
            <span className="text-xs text-slate-400">{totalProduceCount}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {produceEntries.map(([cropType, count]) => {
              const definition = getCropDefinitionByCrop(cropType);
              return (
                <span
                  key={cropType}
                  title={definition.cropLabel}
                  aria-label={`${definition.cropLabel} x ${count}`}
                  className="inline-flex items-center gap-2 rounded-full bg-white/7 px-3 py-2 text-sm text-slate-100"
                >
                  <PixelIcon src={definition.cropIcon} size={30} />
                  <span className="tabular-nums">x {count}</span>
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
