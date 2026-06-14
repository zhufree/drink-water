import { CheckCircle2, Sparkles } from "lucide-react";
import { CROP_DEFINITIONS } from "../config/seedExchange";
import { useI18n } from "../i18n";

type InitialSeedGrantModalProps = {
  onDismiss: () => void;
};

export function InitialSeedGrantModal({ onDismiss }: InitialSeedGrantModalProps) {
  const { t } = useI18n();
  const starterSeeds = CROP_DEFINITIONS.filter((crop) => crop.tier === 1);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/76 px-4 backdrop-blur-md">
      <section className="panel-surface w-full max-w-[460px] rounded-[22px] p-5 text-slate-50 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-emerald-300/14 text-emerald-100">
            <Sparkles className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100/85">
              {t("initialSeeds.badge")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-50">
              {t("initialSeeds.title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300/78">
              {t("initialSeeds.description")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {starterSeeds.map((seed) => (
            <div
              key={seed.seedType}
              className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-white/6 p-3"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-slate-950/28">
                <img
                  src={seed.seedIcon}
                  alt=""
                  className="h-9 w-9 object-contain"
                  draggable={false}
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-50">
                  {seed.seedLabel || seed.cropLabel}
                </span>
                <span className="mt-0.5 block text-xs text-emerald-100/85">
                  {t("initialSeeds.seedCount", { count: 1 })}
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-sky-300 to-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-px"
          >
            <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} />
            {t("initialSeeds.confirm")}
          </button>
        </div>
      </section>
    </div>
  );
}
