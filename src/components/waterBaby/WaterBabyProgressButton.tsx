import type { RefObject } from "react";
import type { ActiveExpedition } from "../../types";
import { useI18n } from "../../i18n";
import { WaterBabyAvatar } from "./WaterBabyAvatar";

type WaterBabyProgressButtonProps = {
  buttonRef: RefObject<HTMLButtonElement>;
  expedition: ActiveExpedition | null;
  progressPercent: number;
  returned: boolean;
  onClick: () => void;
};

export function WaterBabyProgressButton({
  buttonRef,
  expedition,
  progressPercent,
  returned,
  onClick
}: WaterBabyProgressButtonProps) {
  const { t } = useI18n();
  const stateCopy = returned
    ? t("waterBaby.stateReady")
    : expedition
      ? t("waterBaby.stateExploring")
      : t("waterBaby.stateAtHome");

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={t("waterBaby.open", { state: stateCopy })}
      className="group absolute inset-0 z-10 flex flex-col items-center justify-center rounded-full text-white outline-none transition hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/85"
    >
      <span className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105">
        <WaterBabyAvatar state={returned ? "ready" : expedition ? "exploring" : "home"} />
      </span>
      <span className="absolute bottom-2 rounded-full border border-white/25 bg-sky-950/42 px-1.5 py-0.5 text-[9px] font-bold leading-none tracking-wide text-white backdrop-blur-sm">
        {progressPercent}%
      </span>
    </button>
  );
}
