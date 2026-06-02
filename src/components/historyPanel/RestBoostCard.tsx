import type { RestState } from "../../types";
import { useI18n } from "../../i18n";

type RestBoostCardProps = {
  restState: RestState;
  restCooldownRemainingSeconds: number;
  upcomingBoostHours: number;
  onStartRest: () => void;
};

export function RestBoostCard({
  restState,
  restCooldownRemainingSeconds,
  upcomingBoostHours,
  onStartRest
}: RestBoostCardProps) {
  const { t } = useI18n();

  return (
    <article className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="m-0 text-lg font-semibold text-slate-50">{t("rest.title")}</h3>
          <p className="mt-1 text-sm text-slate-300/78">{t("rest.description")}</p>
        </div>
        <button
          type="button"
          onClick={onStartRest}
          disabled={restState.active || restCooldownRemainingSeconds > 0}
          className="rounded-[16px] bg-gradient-to-r from-amber-200 to-emerald-200 px-4 py-3 font-semibold text-slate-950 transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          {t("rest.start")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm text-slate-100">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          {t("rest.nextBoost", { hours: String(upcomingBoostHours) })}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm text-slate-100">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          {restCooldownRemainingSeconds > 0
            ? t("rest.cooldown", {
                minutes: String(Math.ceil(restCooldownRemainingSeconds / 60))
              })
            : t("rest.ready")}
        </span>
      </div>
    </article>
  );
}
