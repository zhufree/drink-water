import { Clock3, MapPin, PackageCheck } from "lucide-react";
import type { ActiveExpedition } from "../../types";
import { useI18n } from "../../i18n";
import {
  getCropDefinitionByCrop,
  getCropDefinitionBySeed
} from "../historyPanel/historyPanelData";

type WaterBabyJourneyDetailsProps = {
  expedition: ActiveExpedition;
  returned: boolean;
  routeName: (routeId: string) => string;
  onClaimExpedition: (expeditionId: string) => void;
};

export function WaterBabyJourneyDetails({
  expedition,
  returned,
  routeName,
  onClaimExpedition
}: WaterBabyJourneyDetailsProps) {
  const { t } = useI18n();

  return (
    <div className="mt-4 grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[16px] border border-white/8 bg-white/5 p-3">
          <MapPin size={18} className="text-sky-200" />
          <span className="mt-2 block text-[11px] text-slate-300/65">
            {t("waterBaby.route")}
          </span>
          <strong className="mt-1 block text-sm text-slate-100">
            {routeName(expedition.routeId)}
          </strong>
        </div>
        <div className="rounded-[16px] border border-white/8 bg-white/5 p-3">
          <Clock3 size={18} className="text-sky-200" />
          <span className="mt-2 block text-[11px] text-slate-300/65">
            {t("waterBaby.supply")}
          </span>
          <strong className="mt-1 block text-sm text-slate-100">
            {getCropDefinitionByCrop(expedition.supplyCropType).cropLabel}
          </strong>
        </div>
      </div>
      {returned ? (
        <div className="rounded-[16px] border border-emerald-200/15 bg-emerald-300/8 p-3">
          <div className="flex flex-wrap gap-2">
            {expedition.rewards.map((reward, index) => (
              <span
                key={`${reward.kind}-${index}`}
                className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-xs text-slate-100"
              >
                {reward.kind === "material"
                  ? `${t(reward.materialType === "wood" ? "waterBaby.wood" : "waterBaby.stone")} × ${reward.count}`
                  : `${getCropDefinitionBySeed(reward.seedType).seedLabel} × ${reward.count}`}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onClaimExpedition(expedition.expeditionId)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[14px] bg-emerald-300 px-3 py-2.5 text-sm font-semibold text-emerald-950 transition hover:brightness-105"
          >
            <PackageCheck size={17} />
            {t("waterBaby.claim")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
