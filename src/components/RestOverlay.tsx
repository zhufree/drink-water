import type { I18nApi } from "../i18n";

type RestOverlayProps = {
  i18n: I18nApi;
  remainingSeconds: number;
  plannedBoostSeconds: number;
  onCancel: () => void;
};

export function RestOverlay({
  i18n,
  remainingSeconds,
  plannedBoostSeconds,
  onCancel
}: RestOverlayProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(85,208,255,0.18),transparent_28%),linear-gradient(180deg,rgba(7,13,24,0.98),rgba(4,8,16,0.99))] px-6">
      <div className="w-full max-w-[420px] rounded-[28px] border border-white/10 bg-[rgba(8,15,28,0.92)] p-6 text-center shadow-[0_28px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <p className="m-0 text-sm font-medium tracking-[0.24em] text-cyan-200/72">
          {i18n.t("rest.overlayEyebrow")}
        </p>
        <h2 className="mt-3 text-[34px] font-bold text-slate-50">
          {formatCountdown(remainingSeconds)}
        </h2>
        <p className="mt-3 text-sm text-slate-300/80">
          {i18n.t("rest.overlayDescription", {
            hours: formatBoostHours(plannedBoostSeconds)
          })}
        </p>
        <div className="mt-5 rounded-[18px] bg-white/6 px-4 py-3 text-left">
          <span className="block text-xs text-slate-400">{i18n.t("rest.overlayBoost")}</span>
          <strong className="mt-1 block text-lg text-slate-50">
            {i18n.t("rest.overlayBoostValue", {
              hours: formatBoostHours(plannedBoostSeconds)
            })}
          </strong>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-6 rounded-[16px] bg-white/10 px-4 py-3 font-semibold text-slate-100 transition hover:-translate-y-px hover:bg-white/16"
        >
          {i18n.t("rest.cancel")}
        </button>
      </div>
    </div>
  );
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatBoostHours(totalSeconds: number) {
  return Math.max(0, Math.round(totalSeconds / 3600));
}
