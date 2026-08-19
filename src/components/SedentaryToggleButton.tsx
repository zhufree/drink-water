import { Armchair, PersonStanding } from "lucide-react";
import type { SedentaryStatus } from "../types";
import { useI18n } from "../i18n";

type SedentaryToggleButtonProps = {
  status: SedentaryStatus;
  onToggle: () => void;
};

export function SedentaryToggleButton({
  status,
  onToggle
}: SedentaryToggleButtonProps) {
  const { t } = useI18n();
  const seated = status.seated;
  const label = seated ? t("sedentary.stand") : t("sedentary.sit");
  const ariaLabel = seated ? t("sedentary.standAria") : t("sedentary.sitAria");

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onToggle}
      className={`absolute bottom-3 left-1/2 z-30 flex h-16 w-16 -translate-x-1/2 flex-col items-center justify-center gap-0.5 rounded-full border text-slate-950 shadow-[0_16px_38px_rgba(15,23,42,0.34)] transition hover:-translate-x-1/2 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        seated
          ? "border-emerald-100/75 bg-emerald-200 hover:bg-emerald-100"
          : "border-amber-100/75 bg-amber-200 hover:bg-amber-100"
      }`}
    >
      {seated ? (
        <PersonStanding className="h-6 w-6" strokeWidth={2.1} />
      ) : (
        <Armchair className="h-6 w-6" strokeWidth={2.1} />
      )}
      <span className="max-w-[48px] truncate text-[11px] font-semibold leading-none">
        {label}
      </span>
    </button>
  );
}
