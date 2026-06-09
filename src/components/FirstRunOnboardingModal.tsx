import { useState } from "react";
import { CheckCircle2, Cloud, MonitorSmartphone, RefreshCw } from "lucide-react";
import { useI18n } from "../i18n";

type FirstRunOnboardingModalProps = {
  onDone: () => void;
};

export function FirstRunOnboardingModal({ onDone }: FirstRunOnboardingModalProps) {
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/76 px-4 backdrop-blur-md">
      <section className="panel-surface w-full max-w-[540px] rounded-[22px] p-5 text-slate-50 shadow-2xl">

        <div className="mt-4">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/85">
            {t("onboarding.badge")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-50">
            {t("onboarding.title")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300/82">
            {t("onboarding.description")}
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="flex gap-3 rounded-[16px] bg-white/6 p-3">
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100" strokeWidth={2} />
            <p className="m-0 text-sm leading-6 text-slate-300/82">
              {t("onboarding.recentSync")}
            </p>
          </div>
          <div className="flex gap-3 rounded-[16px] bg-white/6 p-3">
            <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-amber-100" strokeWidth={2} />
            <p className="m-0 text-sm leading-6 text-slate-300/82">
              {t("onboarding.backupSync")}
            </p>
          </div>
        </div>

        {showSyncDetails ? (
          <div className="mt-4 rounded-[16px] border border-white/10 bg-slate-950/35 p-4 text-sm leading-6 text-slate-300/82">
            <p className="m-0 font-semibold text-slate-100">
              {t("onboarding.syncDetailsTitle")}
            </p>
            <p className="mt-2">{t("onboarding.syncDetails")}</p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setShowSyncDetails((value) => !value)}
            className="rounded-[14px] border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:-translate-y-px hover:bg-white/10"
          >
            {showSyncDetails
              ? t("onboarding.hideSyncDetails")
              : t("onboarding.learnSync")}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-sky-300 to-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-px"
          >
            <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} />
            {t("onboarding.start")}
          </button>
        </div>
      </section>
    </div>
  );
}
