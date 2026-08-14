import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { GardenState, TodayStatus } from "../../types";
import {
  getExpeditionTier,
  getUnlockedExpeditionRoutes
} from "../../config/waterBaby";
import { currentDayKey } from "../../hooks/appControllerUtils";
import { useI18n } from "../../i18n";
import { WaterBabyAvatar } from "./WaterBabyAvatar";
import { WaterBabyDepartureForm } from "./WaterBabyDepartureForm";
import { WaterBabyJourneyDetails } from "./WaterBabyJourneyDetails";

type WaterBabyDialogProps = {
  open: boolean;
  status: TodayStatus;
  gardenState: GardenState;
  onClose: () => void;
  onStartExpedition: (routeId: string, cropType: string) => void;
  onClaimExpedition: (expeditionId: string) => void;
};

export function WaterBabyDialog({
  open,
  status,
  gardenState,
  onClose,
  onStartExpedition,
  onClaimExpedition
}: WaterBabyDialogProps) {
  const { t, formatDateTime } = useI18n();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const routes = useMemo(
    () => getUnlockedExpeditionRoutes(gardenState.waterBaby.completedProjectIds),
    [gardenState.waterBaby.completedProjectIds]
  );
  const produce = useMemo(
    () => gardenState.produce.filter((item) => item.count > 0),
    [gardenState.produce]
  );
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "nearbyPath");
  const [cropType, setCropType] = useState(produce[0]?.cropType ?? "");
  const [now, setNow] = useState(() => Date.now());
  const expedition = gardenState.waterBaby.activeExpedition;
  const returned = Boolean(expedition && new Date(expedition.returnsAt).getTime() <= now);
  const tier = getExpeditionTier(status.actualIntakeMl, status.targetMl);
  const alreadyWentToday =
    gardenState.waterBaby.lastExpeditionStartedDay === currentDayKey();

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!routes.some((route) => route.id === routeId)) {
      setRouteId(routes[0]?.id ?? "nearbyPath");
    }
  }, [routeId, routes]);

  useEffect(() => {
    if (!produce.some((item) => item.cropType === cropType)) {
      setCropType(produce[0]?.cropType ?? "");
    }
  }, [cropType, produce]);

  if (!open) return null;

  const routeName = (id: string) => {
    if (id === "forestTrail") return t("waterBaby.route.forestTrail");
    if (id === "mountainPath") return t("waterBaby.route.mountainPath");
    if (id === "riverside") return t("waterBaby.route.riverside");
    return t("waterBaby.route.nearbyPath");
  };
  const stateCopy = returned
    ? t("waterBaby.stateReady")
    : expedition
      ? t("waterBaby.stateExploring")
      : t("waterBaby.stateAtHome");
  const readinessCopy = alreadyWentToday
    ? t("waterBaby.usedToday")
    : tier === "long"
      ? t("waterBaby.longReady")
      : tier === "short"
        ? t("waterBaby.shortReady")
        : t("waterBaby.locked");

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/72 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="water-baby-dialog-title"
        className="max-h-[min(680px,92vh)] w-full max-w-[520px] overflow-y-auto rounded-[24px] border border-white/10 bg-[rgba(30,43,64,0.98)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.48)]"
      >
        <header className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-sky-200/20 bg-sky-300/12">
            <WaterBabyAvatar
              state={returned ? "ready" : expedition ? "exploring" : "home"}
              className="h-10 w-9"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="water-baby-dialog-title" className="m-0 text-xl font-semibold text-slate-50">
              {t("waterBaby.title")}
            </h2>
            <p className="mt-1 text-sm text-sky-100/72">{stateCopy}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t("exchange.close")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-slate-100 transition hover:bg-white/12"
          >
            <X size={20} />
          </button>
        </header>

        <div className="mt-5 rounded-[18px] border border-sky-200/12 bg-sky-300/7 p-4">
          <p className="m-0 text-sm leading-relaxed text-slate-200/85">
            {expedition
              ? t("waterBaby.returnsAt", { time: formatDateTime(expedition.returnsAt) })
              : readinessCopy}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200/78">
            <span className="rounded-full border border-amber-200/15 bg-amber-300/9 px-2.5 py-1">
              {t("waterBaby.wood")} {gardenState.waterBaby.materials.wood}
            </span>
            <span className="rounded-full border border-slate-200/15 bg-white/6 px-2.5 py-1">
              {t("waterBaby.stone")} {gardenState.waterBaby.materials.stone}
            </span>
          </div>
        </div>

        {expedition ? (
          <WaterBabyJourneyDetails
            expedition={expedition}
            returned={returned}
            routeName={routeName}
            onClaimExpedition={onClaimExpedition}
          />
        ) : !alreadyWentToday ? (
          <WaterBabyDepartureForm
            routes={routes}
            produce={produce}
            routeId={routeId}
            cropType={cropType}
            tier={tier}
            routeName={routeName}
            onRouteChange={setRouteId}
            onCropChange={setCropType}
            onStart={() => {
              onStartExpedition(routeId, cropType);
              onClose();
            }}
          />
        ) : null}
      </section>
    </div>
  );
}
