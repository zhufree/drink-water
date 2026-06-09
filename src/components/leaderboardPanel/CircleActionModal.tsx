import { X } from "lucide-react";
import { useI18n } from "../../i18n";

export type CircleActionModalState =
  | null
  | { type: "remove-member"; accountId: string; displayName: string }
  | { type: "leave-circle" }
  | { type: "disband-circle" };

type CircleActionModalProps = {
  action: CircleActionModalState;
  onClose: () => void;
  onConfirm: () => void;
};

export function CircleActionModal({
  action,
  onClose,
  onConfirm
}: CircleActionModalProps) {
  const { t } = useI18n();

  if (!action) {
    return null;
  }

  const title =
    action.type === "remove-member"
      ? t("leaderboard.actionRemoveMemberTitle")
      : action.type === "leave-circle"
        ? t("leaderboard.actionLeaveCircleTitle")
        : t("leaderboard.actionDisbandCircleTitle");

  const description =
    action.type === "remove-member"
      ? t("leaderboard.actionRemoveMemberDescription", { name: action.displayName })
      : action.type === "leave-circle"
        ? t("leaderboard.actionLeaveCircleDescription")
        : t("leaderboard.actionDisbandCircleDescription");

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/72 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(7,13,24,0.96)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="m-0 text-xl font-semibold text-slate-50">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300/80">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("leaderboard.actionClose")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
          >
            <X className="h-4 w-4" strokeWidth={2.1} />
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[14px] border border-white/12 bg-white/6 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            {t("leaderboard.actionCancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[14px] border border-rose-200/30 bg-rose-300/10 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:-translate-y-px hover:bg-rose-300/16"
          >
            {t("leaderboard.actionConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
