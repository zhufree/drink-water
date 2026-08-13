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
    <article className="panel-surface panel-surface-flat rounded-[22px] p-4">
      <h3 className="m-0 text-lg font-semibold text-slate-50">{t("garden.collectionTitle")}</h3>
      <p className="mt-1 text-sm text-slate-300/78">{t("garden.collectionDescription")}</p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {collection.length > 0 ? (
          collection.map((item) => {
            const definition = getCropDefinitionByCrop(item.cropType);
            return (
              <span
                key={item.cropType}
                title={definition.cropLabel}
                aria-label={`${definition.cropLabel} x ${item.harvestCount}`}
                className="flex min-w-0 items-center justify-center gap-1 rounded-[14px] border border-white/8 bg-white/4 px-2 py-2 text-sm text-slate-100"
              >
                <PixelIcon src={definition.cropIcon} size={26} />
                <span className="truncate tabular-nums">x {item.harvestCount}</span>
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
