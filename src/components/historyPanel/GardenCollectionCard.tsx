import type { GardenCollectionItem } from "../../types";
import { useI18n } from "../../i18n";
import { PixelIcon } from "./PixelIcon";
import { getCropDefinitionByCrop } from "./historyPanelData";

type GardenCollectionCardProps = {
  collection: GardenCollectionItem[];
};

export function GardenCollectionCard({ collection }: GardenCollectionCardProps) {
  const { t } = useI18n();

  return (
    <article className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
      <h3 className="m-0 text-lg font-semibold text-slate-50">{t("garden.collectionTitle")}</h3>
      <p className="mt-1 text-sm text-slate-300/78">{t("garden.collectionDescription")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {collection.length > 0 ? (
          collection.map((item) => {
            const definition = getCropDefinitionByCrop(item.cropType);
            return (
              <span
                key={item.cropType}
                title={definition.cropLabel}
                aria-label={`${definition.cropLabel} x ${item.harvestCount}`}
                className="inline-flex items-center gap-2 rounded-full bg-white/7 px-3 py-2 text-sm text-slate-100"
              >
                <PixelIcon src={definition.cropIcon} size={30} />
                <span className="tabular-nums">x {item.harvestCount}</span>
              </span>
            );
          })
        ) : (
          <span className="rounded-full bg-white/5 px-3 py-2 text-sm text-slate-300/78">
            {t("garden.collectionEmpty")}
          </span>
        )}
      </div>
    </article>
  );
}
