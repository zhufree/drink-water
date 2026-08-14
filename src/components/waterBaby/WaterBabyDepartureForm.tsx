import type { ProduceInventoryItem } from "../../types";
import type {
  ExpeditionRouteDefinition,
  ExpeditionTier
} from "../../config/waterBaby";
import { useI18n } from "../../i18n";
import { getCropDefinitionByCrop } from "../historyPanel/historyPanelData";
import { PixelIcon } from "../historyPanel/PixelIcon";

type WaterBabyDepartureFormProps = {
  routes: ExpeditionRouteDefinition[];
  produce: ProduceInventoryItem[];
  routeId: string;
  cropType: string;
  tier: ExpeditionTier;
  routeName: (routeId: string) => string;
  onRouteChange: (routeId: string) => void;
  onCropChange: (cropType: string) => void;
  onStart: () => void;
};

export function WaterBabyDepartureForm({
  routes,
  produce,
  routeId,
  cropType,
  tier,
  routeName,
  onRouteChange,
  onCropChange,
  onStart
}: WaterBabyDepartureFormProps) {
  const { t } = useI18n();

  return (
    <div className="mt-4 grid gap-4">
      <label className="block text-xs font-medium text-slate-300/75">
        {t("waterBaby.route")}
        <select
          value={routeId}
          onChange={(event) => onRouteChange(event.target.value)}
          className="mt-1.5 w-full rounded-[12px] border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
        >
          {routes.map((route) => (
            <option key={route.id} value={route.id}>{routeName(route.id)}</option>
          ))}
        </select>
      </label>
      <div>
        <p className="m-0 text-xs font-medium text-slate-300/75">
          {t("waterBaby.supply")}
        </p>
        {produce.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {produce.map((item) => {
              const definition = getCropDefinitionByCrop(item.cropType);
              const active = item.cropType === cropType;
              return (
                <button
                  key={item.cropType}
                  type="button"
                  onClick={() => onCropChange(item.cropType)}
                  aria-pressed={active}
                  className={`flex items-center gap-2 rounded-[12px] border px-2.5 py-2 text-xs transition ${
                    active
                      ? "border-amber-200/45 bg-amber-300/14 text-amber-50"
                      : "border-white/8 bg-white/5 text-slate-200 hover:bg-white/8"
                  }`}
                >
                  <PixelIcon src={definition.cropIcon} size={22} />
                  <span>{definition.cropLabel} × {item.count}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 rounded-[14px] border border-amber-200/12 bg-amber-300/8 p-3 text-sm text-amber-100/82">
            {t("waterBaby.noProduce")}
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={!cropType || tier === "locked"}
        onClick={onStart}
        className="w-full rounded-[14px] bg-sky-300 px-3 py-3 text-sm font-semibold text-sky-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t("waterBaby.prepare")}
      </button>
    </div>
  );
}
