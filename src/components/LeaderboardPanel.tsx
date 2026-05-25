import { useI18n } from "../i18n";
import type { CircleSummary, LeaderboardEntry } from "../types";

type LeaderboardPanelProps = {
  displayName: string;
  cloudIdentityState: "loading" | "ready" | "error";
  cloudIdentityError: string | null;
  activeCircleCode: string;
  activeCircleName: string;
  circles: CircleSummary[];
  circlesLoadState: "loading" | "ready" | "error";
  circleCodeInput: string;
  circleNameInput: string;
  metric: "intake" | "progress";
  leaderboard: LeaderboardEntry[];
  loading: boolean;
  onDisplayNameChange: (value: string) => void;
  onCircleCodeInputChange: (value: string) => void;
  onCircleNameInputChange: (value: string) => void;
  onCreateCircle: () => void;
  onJoinCircle: () => void;
  onReconnectIdentity: () => void;
  onSelectCircle: (circle: CircleSummary) => void;
  onMetricChange: (metric: "intake" | "progress") => void;
  onRefresh: () => void;
};

export function LeaderboardPanel({
  displayName,
  cloudIdentityState,
  cloudIdentityError,
  activeCircleCode,
  activeCircleName,
  circles,
  circlesLoadState,
  circleCodeInput,
  circleNameInput,
  metric,
  leaderboard,
  loading,
  onDisplayNameChange,
  onCircleCodeInputChange,
  onCircleNameInputChange,
  onCreateCircle,
  onJoinCircle,
  onReconnectIdentity,
  onSelectCircle,
  onMetricChange,
  onRefresh
}: LeaderboardPanelProps) {
  const { t, formatMl } = useI18n();
  const activeCircle = circles.find((item) => item.circleCode === activeCircleCode);
  const showResolvedActiveCircle = Boolean(
    activeCircleCode && (activeCircle || circlesLoadState === "error")
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-semibold text-slate-50">{t("leaderboard.title")}</h2>
            <p className="mt-1 text-sm text-slate-300/78">{t("leaderboard.description")}</p>
          </div>
          <button
            onClick={onRefresh}
            className="rounded-[14px] bg-white/8 px-3 py-2 text-sm text-slate-100 transition hover:-translate-y-px hover:bg-white/14"
          >
            {loading ? t("leaderboard.loading") : t("leaderboard.refresh")}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-300/70">{t("leaderboard.displayName")}</span>
            <input
              type="text"
              maxLength={32}
              value={displayName}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              className="rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 outline-none"
            />
          </label>
        </div>

        <div className="mt-4 rounded-[18px] bg-white/5 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="m-0 text-sm font-medium text-slate-100">
                {t("leaderboard.identityStatusTitle")}
              </p>
              <p
                className={`mt-1 text-sm ${
                  cloudIdentityState === "ready"
                    ? "text-emerald-200"
                    : cloudIdentityState === "error"
                      ? "text-amber-200"
                      : "text-slate-300/76"
                }`}
              >
                {cloudIdentityState === "ready"
                  ? t("leaderboard.identityReady")
                  : cloudIdentityState === "error"
                    ? t("leaderboard.identityError")
                    : t("leaderboard.identityLoading")}
              </p>
              {cloudIdentityState === "error" && cloudIdentityError ? (
                <p className="mt-2 text-xs text-slate-300/70">{cloudIdentityError}</p>
              ) : null}
            </div>
            <button
              onClick={onReconnectIdentity}
              className="rounded-[12px] bg-white/8 px-3 py-2 text-sm text-slate-100 transition hover:-translate-y-px hover:bg-white/14"
            >
              {t("leaderboard.identityRetry")}
            </button>
          </div>
        </div>

        {showResolvedActiveCircle ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-cyan-300/12 px-3 py-2 text-sm text-cyan-100">
              {t("leaderboard.activeCircle", {
                name: activeCircleName || activeCircle?.circleName || activeCircleCode
              })}
            </span>
            <span className="rounded-full bg-white/6 px-3 py-2 text-sm text-slate-200">
              {t("leaderboard.circleCode", { code: activeCircleCode })}
            </span>
          </div>
        ) : (
          <p className="mt-4 rounded-[18px] bg-white/5 px-4 py-3 text-sm text-slate-300/76">
            {t("leaderboard.empty")}
          </p>
        )}
      </div>

      <div className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <strong className="text-sm font-semibold text-slate-50">{t("leaderboard.circleTitle")}</strong>
        <p className="mt-2 text-sm text-slate-300/78">{t("leaderboard.circleDescription")}</p>

        <div className="mt-4 grid gap-3 grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-300/70">{t("leaderboard.circleCreateName")}</span>
            <input
              type="text"
              maxLength={48}
              value={circleNameInput}
              onChange={(event) => onCircleNameInputChange(event.target.value)}
              className="rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 outline-none"
            />
          </label>
          <div className="flex items-end">
            <button
              onClick={onCreateCircle}
              className="w-full rounded-[14px] border border-cyan-200/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:-translate-y-px hover:bg-cyan-300/16"
            >
              {t("leaderboard.circleCreate")}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-300/70">{t("leaderboard.circleJoinCode")}</span>
            <input
              type="text"
              maxLength={6}
              value={circleCodeInput}
              onChange={(event) => onCircleCodeInputChange(event.target.value.toUpperCase())}
              className="rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 uppercase outline-none"
            />
          </label>
          <div className="flex items-end">
            <button
              onClick={onJoinCircle}
              className="w-full rounded-[14px] border border-emerald-200/30 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:-translate-y-px hover:bg-emerald-300/16"
            >
              {t("leaderboard.circleJoin")}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {circlesLoadState === "loading" ? (
            <span className="text-sm text-slate-300/70">{t("leaderboard.circleLoading")}</span>
          ) : circlesLoadState === "error" ? (
            <span className="text-sm text-amber-200">{t("leaderboard.circleLoadFailed")}</span>
          ) : circles.length > 0 ? (
            circles.map((circle) => {
              const active = activeCircleCode === circle.circleCode;
              return (
                <button
                  key={circle.circleCode}
                  onClick={() => onSelectCircle(circle)}
                  className={`rounded-full px-3 py-2 text-sm transition ${
                    active
                      ? "bg-gradient-to-r from-sky-300 to-blue-500 font-semibold text-slate-950"
                      : "bg-white/7 text-slate-100 hover:-translate-y-px"
                  }`}
                >
                  {circle.circleName || circle.circleCode}
                </button>
              );
            })
          ) : (
            <span className="text-sm text-slate-300/70">{t("leaderboard.circleEmpty")}</span>
          )}
        </div>
      </div>

      {activeCircleCode ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onMetricChange("intake")}
              className={`rounded-[14px] px-3 py-2.5 text-sm font-semibold transition ${
                metric === "intake"
                  ? "bg-gradient-to-r from-sky-300 to-blue-500 text-slate-950"
                  : "bg-white/7 text-slate-100 hover:-translate-y-px"
              }`}
            >
              {t("leaderboard.metricIntake")}
            </button>
            <button
              onClick={() => onMetricChange("progress")}
              className={`rounded-[14px] px-3 py-2.5 text-sm font-semibold transition ${
                metric === "progress"
                  ? "bg-gradient-to-r from-emerald-300 to-cyan-300 text-slate-950"
                  : "bg-white/7 text-slate-100 hover:-translate-y-px"
              }`}
            >
              {t("leaderboard.metricProgress")}
            </button>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-[rgba(7,13,24,0.52)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
            {leaderboard.length > 0 ? (
              <div className="flex flex-col gap-2">
                {leaderboard.map((entry) => (
                  <article
                    key={entry.deviceId}
                    className="flex items-center justify-between gap-3 rounded-[18px] bg-white/5 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-sm font-bold text-cyan-100">
                        #{entry.rank}
                      </div>
                      <div>
                        <strong className="block text-sm font-semibold text-slate-50">
                          {entry.displayName}
                        </strong>
                        <span className="mt-1 block text-xs text-slate-300/70">
                          {metric === "intake"
                            ? t("leaderboard.intakeValue", {
                                amount: formatMl(entry.actualIntakeMl)
                              })
                            : t("leaderboard.progressValue", {
                                percent: entry.progressPercent
                              })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <strong className="block text-base font-semibold text-slate-50">
                        {formatMl(entry.actualIntakeMl)}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-300/68">
                        {t("leaderboard.targetValue", {
                          amount: formatMl(entry.targetMl)
                        })}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-300/76">{t("leaderboard.noData")}</p>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
