import { useEffect, useRef, useState } from "react";
import { Check, Copy, RefreshCw, Star } from "lucide-react";
import { useI18n } from "../i18n";
import type { CircleSummary, LeaderboardCircleMeta, LeaderboardEntry } from "../types";
import {
  CircleActionModal,
  type CircleActionModalState
} from "./leaderboardPanel/CircleActionModal";

type LeaderboardPanelProps = {
  displayName: string;
  nicknameSaving: boolean;
  nicknameSaveState: "idle" | "success" | "error";
  nicknameSaveMessage: string | null;
  cloudIdentityState: "loading" | "ready" | "error";
  cloudIdentityError: string | null;
  activeCircleCode: string;
  activeCircleName: string;
  viewerAccountId: string | null;
  circleMeta: LeaderboardCircleMeta;
  circles: CircleSummary[];
  circlesLoadState: "loading" | "ready" | "error";
  circleCodeInput: string;
  circleNameInput: string;
  metric: "intake" | "progress";
  leaderboard: LeaderboardEntry[];
  loading: boolean;
  onDisplayNameChange: (value: string) => void;
  onSaveDisplayName: () => void;
  onCircleCodeInputChange: (value: string) => void;
  onCircleNameInputChange: (value: string) => void;
  onCreateCircle: () => void;
  onJoinCircle: () => void;
  onReconnectIdentity: () => void;
  onSelectCircle: (circle: CircleSummary) => void;
  onMetricChange: (metric: "intake" | "progress") => void;
  onRemoveMember: (targetAccountId: string, displayName: string) => void;
  onLeaveCircle: () => void;
  onDisbandCircle: () => void;
  onRefresh: () => void;
};

export function LeaderboardPanel({
  displayName,
  nicknameSaving,
  nicknameSaveState,
  nicknameSaveMessage,
  cloudIdentityState,
  cloudIdentityError,
  activeCircleCode,
  activeCircleName,
  viewerAccountId,
  circleMeta,
  circles,
  circlesLoadState,
  circleCodeInput,
  circleNameInput,
  metric,
  leaderboard,
  loading,
  onDisplayNameChange,
  onSaveDisplayName,
  onCircleCodeInputChange,
  onCircleNameInputChange,
  onCreateCircle,
  onJoinCircle,
  onReconnectIdentity,
  onSelectCircle,
  onMetricChange,
  onRemoveMember,
  onLeaveCircle,
  onDisbandCircle,
  onRefresh
}: LeaderboardPanelProps) {
  const { t, formatMl } = useI18n();
  const [copied, setCopied] = useState(false);
  const [pendingAction, setPendingAction] = useState<CircleActionModalState>(null);
  const copiedTimerRef = useRef<number | null>(null);
  const activeCircle = circles.find((item) => item.circleCode === activeCircleCode);
  const ownerResolved = Boolean(viewerAccountId && circleMeta.ownerAccountId);
  const isOwner = Boolean(
    viewerAccountId &&
      circleMeta.ownerAccountId &&
      circleMeta.ownerAccountId === viewerAccountId
  );
  const canDisband = ownerResolved && isOwner && circleMeta.memberCount === 1;
  const canLeave = ownerResolved && Boolean(activeCircleCode) && !isOwner;
  const showResolvedActiveCircle = Boolean(
    activeCircleCode && (activeCircle || circlesLoadState === "error")
  );
  const nicknameStatusClass =
    nicknameSaveState === "success"
      ? "text-emerald-200/82"
      : nicknameSaveState === "error"
        ? "text-amber-200/88"
        : "text-slate-400/70";

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  return (
    <section className="flex flex-col gap-3">
      <div className="panel-surface rounded-[22px] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-semibold text-slate-50">{t("leaderboard.title")}</h2>
            <p className="mt-1 text-sm text-slate-300/78">{t("leaderboard.description")}</p>
          </div>
          <button
            onClick={onRefresh}
            title={loading ? t("leaderboard.loading") : t("leaderboard.refresh")}
            aria-label={loading ? t("leaderboard.loading") : t("leaderboard.refresh")}
            className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/8 text-slate-100 transition hover:bg-white/14"
          >
            <RefreshCw className={`h-[18px] w-[18px] ${loading ? "animate-spin" : ""}`} strokeWidth={1.9} />
          </button>
        </div>

        {showResolvedActiveCircle ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-cyan-300/12 px-3 py-2 text-sm text-cyan-100">
              {t("leaderboard.activeCircle", {
                name: activeCircleName || activeCircle?.circleName || activeCircleCode
              })}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/6 px-3 py-2 text-sm text-slate-200">
              <span>{t("leaderboard.circleCode", { code: activeCircleCode })}</span>
              <button
                type="button"
                title={copied ? "Copied" : "Copy"}
                aria-label={copied ? "Copied" : "Copy"}
                onClick={() => void handleCopyCircleCode(activeCircleCode)}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                  copied
                    ? "bg-emerald-300/18 text-emerald-100"
                    : "bg-white/8 text-slate-200 hover:bg-white/14"
                }`}
              >
                {copied ? (
                  <Check className="h-4 w-4" strokeWidth={2.2} />
                ) : (
                  <Copy className="h-4 w-4" strokeWidth={1.9} />
                )}
              </button>
            </span>
          </div>
        ) : (
          <p className="mt-4 rounded-[18px] bg-white/5 px-4 py-3 text-sm text-slate-300/76">
            {t("leaderboard.empty")}
          </p>
        )}
        {activeCircleCode ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => onMetricChange("intake")}
                className={`rounded-[14px] px-3 py-2.5 text-sm font-semibold transition ${
                  metric === "intake"
                    ? "no-text-clarity bg-gradient-to-r from-sky-300 to-blue-500 text-slate-950"
                    : "bg-white/5 text-slate-100 hover:bg-white/8"
                }`}
              >
                {t("leaderboard.metricIntake")}
              </button>
              <button
                onClick={() => onMetricChange("progress")}
                className={`rounded-[14px] px-3 py-2.5 text-sm font-semibold transition ${
                  metric === "progress"
                    ? "no-text-clarity bg-gradient-to-r from-emerald-300 to-cyan-300 text-slate-950"
                    : "bg-white/5 text-slate-100 hover:bg-white/8"
                }`}
              >
                {t("leaderboard.metricProgress")}
              </button>
            </div>

            <div className="mt-3">
              {leaderboard.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {leaderboard.map((entry) => {
                    const canManageMember = isOwner && entry.accountId !== viewerAccountId;
                    return (
                    <article
                      key={entry.accountId}
                      onClick={() => {
                        if (canManageMember) {
                          setPendingAction({
                            type: "remove-member",
                            accountId: entry.accountId,
                            displayName: entry.displayName
                          });
                        }
                      }}
                      className={`flex items-center justify-between gap-3 rounded-[18px] p-3 transition ${
                        canManageMember
                          ? "cursor-pointer bg-white/6 hover:-translate-y-px hover:bg-white/10"
                          : "bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {entry.rank <= 3 ? (
                          <div
                            className={`relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                              entry.rank === 1
                                ? "bg-amber-300/18 text-amber-100"
                                : entry.rank === 2
                                  ? "bg-slate-200/18 text-slate-100"
                                  : "bg-orange-300/18 text-orange-100"
                            }`}
                          >
                            <Star className="h-5 w-5 fill-current" strokeWidth={1.8} />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-sm font-bold text-cyan-100">
                            #{entry.rank}
                          </div>
                        )}
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
                  )})}
                </div>
              ) : (
                <p className="text-sm text-slate-300/76">{t("leaderboard.noData")}</p>
              )}
            </div>
          </>
        ) : null}
      </div>

      <div className="rounded-[18px] border border-white/6 bg-white/[0.035] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-xs font-medium uppercase tracking-[0.18em] text-slate-400/70">
              {t("leaderboard.identityStatusTitle")}
            </p>
            <p
              className={`mt-1 text-xs leading-5 ${
                cloudIdentityState === "ready"
                  ? "text-emerald-200/78"
                  : cloudIdentityState === "error"
                    ? "text-amber-200/82"
                    : "text-slate-300/68"
              }`}
            >
              {cloudIdentityState === "ready"
                ? t("leaderboard.identityReady")
                : cloudIdentityState === "error"
                  ? t("leaderboard.identityError")
                  : t("leaderboard.identityLoading")}
            </p>
            {cloudIdentityState === "error" && cloudIdentityError ? (
              <p className="mt-1 text-[11px] text-slate-400/78">{cloudIdentityError}</p>
            ) : null}
          </div>
          <button
            onClick={onReconnectIdentity}
            className="rounded-[12px] bg-white/7 px-3 py-2 text-xs text-slate-100 transition hover:-translate-y-px hover:bg-white/12"
          >
            {t("leaderboard.identityRetry")}
          </button>
        </div>
      </div>

      <div className="panel-surface rounded-[22px] p-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-300/70">{t("leaderboard.displayName")}</span>
          <div className="flex gap-3">
            <input
              type="text"
              maxLength={32}
              value={displayName}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              className="min-w-0 flex-1 rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 outline-none"
            />
            <button
              onClick={onSaveDisplayName}
              className="shrink-0 rounded-[14px] border border-cyan-200/24 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:-translate-y-px hover:bg-cyan-300/16"
            >
              {nicknameSaving ? t("leaderboard.displayNameSaving") : t("leaderboard.displayNameSave")}
            </button>
          </div>
        </label>
        <p className={`mt-2 min-h-5 text-xs ${nicknameStatusClass}`}>
          {nicknameSaveMessage ?? t("leaderboard.identityHint")}
        </p>
      </div>

      <div className="panel-surface rounded-[22px] p-4">
        <strong className="text-sm font-semibold text-slate-50">{t("leaderboard.circleTitle")}</strong>
        <p className="mt-2 text-sm text-slate-300/78">{t("leaderboard.circleDescription")}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
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

        <div className="mt-4 rounded-[18px] border border-cyan-300/14 bg-cyan-300/8 px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.75)]" />
            <p className="m-0 text-sm font-semibold text-cyan-100">
              {t("leaderboard.circleSwitchHint")}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {activeCircleCode ? (
            canLeave ? (
              <button
                onClick={() => setPendingAction({ type: "leave-circle" })}
                className="rounded-[14px] border border-amber-200/30 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:-translate-y-px hover:bg-amber-300/16"
              >
                {t("leaderboard.leaveCircle")}
              </button>
            ) : canDisband ? (
              <button
                onClick={() => setPendingAction({ type: "disband-circle" })}
                className="rounded-[14px] border border-rose-200/30 bg-rose-300/10 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:-translate-y-px hover:bg-rose-300/16"
              >
                {t("leaderboard.disbandCircle")}
              </button>
            ) : isOwner ? (
              <span className="rounded-[14px] border border-white/10 bg-white/6 px-4 py-2.5 text-sm text-slate-300/74">
                {t("leaderboard.ownerLeaveBlocked")}
              </span>
            ) : null
          ) : null}
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
                      ? "no-text-clarity bg-gradient-to-r from-sky-300 to-blue-500 font-semibold text-slate-950 shadow-[0_10px_26px_rgba(59,130,246,0.28)]"
                      : "border border-white/10 bg-white/7 text-slate-100 hover:-translate-y-px hover:border-cyan-200/30 hover:bg-white/10"
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

      <CircleActionModal
        action={pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          const currentAction = pendingAction;
          setPendingAction(null);
          if (!currentAction) {
            return;
          }
          if (currentAction.type === "remove-member") {
            onRemoveMember(currentAction.accountId, currentAction.displayName);
            return;
          }
          if (currentAction.type === "leave-circle") {
            onLeaveCircle();
            return;
          }
          onDisbandCircle();
        }}
      />
    </section>
  );

  async function handleCopyCircleCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 1200);
    } catch {
      setCopied(false);
    }
  }
}
