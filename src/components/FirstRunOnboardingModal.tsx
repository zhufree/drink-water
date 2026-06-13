import { useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  DatabaseBackup,
  Droplets,
  HelpCircle,
  Image,
  KeyRound,
  ListChecks,
  MonitorSmartphone,
  RefreshCw,
  Sprout
} from "lucide-react";
import { useI18n } from "../i18n";

type FirstRunOnboardingModalProps = {
  onDone: () => void;
};

const slideCount = 3;

export function FirstRunOnboardingModal({ onDone }: FirstRunOnboardingModalProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const { t } = useI18n();

  const goPrevious = () => setActiveSlide((current) => Math.max(0, current - 1));
  const goNext = () => setActiveSlide((current) => Math.min(slideCount - 1, current + 1));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/76 px-4 backdrop-blur-md">
      <section className="panel-surface w-full max-w-[540px] rounded-[22px] p-5 text-slate-50 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/85">
              {t("onboarding.badge")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-50">
              {t("onboarding.title")}
            </h2>
          </div>
          <div className="flex items-center gap-1 pt-1">
            {Array.from({ length: slideCount }).map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={t("onboarding.viewSlide", { index: index + 1 })}
                onClick={() => setActiveSlide(index)}
                className={`h-2 rounded-full transition ${
                  index === activeSlide ? "w-6 bg-cyan-200" : "w-2 bg-white/20 hover:bg-white/35"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[20px] border border-white/10 bg-white/5">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            <article className="w-full shrink-0 p-4">
              <p className="m-0 text-sm font-semibold text-cyan-100">{t("onboarding.coreTitle")}</p>
              <div className="mt-4 grid gap-3">
                <FeatureRow icon={<Droplets />} title={t("onboarding.drinkTitle")} copy={t("onboarding.drinkCopy")} />
                <FeatureRow icon={<ListChecks />} title={t("onboarding.logTitle")} copy={t("onboarding.logCopy")} />
                <FeatureRow icon={<Bell />} title={t("onboarding.reminderTitle")} copy={t("onboarding.reminderCopy")} />
              </div>
            </article>

            <article className="w-full shrink-0 p-4">
              <p className="m-0 text-sm font-semibold text-cyan-100">{t("onboarding.gardenTitle")}</p>
              <div className="mt-4 grid gap-3">
                <FeatureRow icon={<Sprout />} title={t("onboarding.plantTitle")} copy={t("onboarding.plantCopy")} />
                <FeatureRow icon={<Image />} title={t("onboarding.backgroundTitle")} copy={t("onboarding.backgroundCopy")} />
                <FeatureRow
                  icon={<HelpCircle />}
                  title="更多功能敬请期待"
                  copy="开发者会努力做更多好玩的东西"
                />
              </div>
            </article>

            <article className="w-full shrink-0 p-4">
              <p className="m-0 text-sm font-semibold text-cyan-100">{t("onboarding.syncTitle")}</p>
              <div className="mt-4 grid gap-3">
                <FeatureRow
                  icon={<MonitorSmartphone />}
                  title={t("onboarding.multiDeviceTitle")}
                  copy={t("onboarding.multiDeviceCopy")}
                />
                <button
                  type="button"
                  onClick={() => setShowSyncDetails((value) => !value)}
                  className="flex items-center justify-between gap-3 rounded-[16px] bg-white/6 p-3 text-left transition hover:bg-white/10"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-amber-200/14 text-amber-100">
                      <Cloud className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-50">{t("onboarding.learnSync")}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-300/70">
                        {t("onboarding.syncOneLine")}
                      </span>
                    </span>
                  </span>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-slate-300 transition ${
                      showSyncDetails ? "rotate-90" : ""
                    }`}
                    strokeWidth={2.2}
                  />
                </button>

                {showSyncDetails ? (
                  <div className="rounded-[16px] border border-white/10 bg-slate-950/35 p-3">
                    <div className="flex items-center gap-2 text-sm text-slate-100">
                      <KeyRound className="h-4 w-4 text-cyan-100" strokeWidth={2} />
                      <span>{t("onboarding.syncFlowOld")}</span>
                      <ArrowRight className="h-4 w-4 text-slate-400" strokeWidth={2} />
                      <span>{t("onboarding.syncFlowNew")}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-300/78">
                      <span className="flex items-start gap-2">
                        <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-100" strokeWidth={2} />
                        <span>{t("onboarding.recentSync")}</span>
                      </span>
                      <span className="flex items-start gap-2">
                        <DatabaseBackup className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-100" strokeWidth={2} />
                        <span>{t("onboarding.backupSync")}</span>
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goPrevious}
            disabled={activeSlide === 0}
            aria-label={t("onboarding.previous")}
            className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/12 bg-white/6 text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
          </button>

          {activeSlide < slideCount - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-white/8 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:-translate-y-px hover:bg-white/12"
            >
              {t("onboarding.next")}
              <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onDone}
              className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-sky-300 to-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-px"
            >
              <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} />
              {t("onboarding.start")}
            </button>
          )}

          <button
            type="button"
            onClick={goNext}
            disabled={activeSlide === slideCount - 1}
            aria-label={t("onboarding.next")}
            className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/12 bg-white/6 text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
      </section>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  copy
}: {
  icon: ReactNode;
  title: string;
  copy?: string;
}) {
  return (
    <div className="flex gap-3 rounded-[16px] bg-white/6 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-cyan-200/12 text-cyan-100 [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-50">{title}</span>
        {copy ? (
          <span className="mt-0.5 block text-xs leading-5 text-slate-300/74">{copy}</span>
        ) : null}
      </span>
    </div>
  );
}
