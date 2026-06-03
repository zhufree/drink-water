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
    <article className="panel-surface panel-surface-flat rounded-[22px] p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="m-0 text-lg font-semibold text-slate-50">{t("rest.title")}</h3>
          <p className="mt-1 text-sm text-slate-300/78">{t("rest.description")}</p>
        </div>
        <button
          type="button"
          onClick={onStartRest}
          disabled={restState.active || restCooldownRemainingSeconds > 0}
          className="no-text-clarity rounded-[16px] bg-amber-200 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("rest.start")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-2 text-sm text-slate-100">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          {t("rest.nextBoost", { hours: String(upcomingBoostHours) })}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-2 text-sm text-slate-100">
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
