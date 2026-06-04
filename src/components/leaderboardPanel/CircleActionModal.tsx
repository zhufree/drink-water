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
  const { locale } = useI18n();
  const isZh = locale === "zh-CN";

  if (!action) {
    return null;
  }

  const title =
    action.type === "remove-member"
      ? isZh
        ? "移出成员"
        : "Remove member"
      : action.type === "leave-circle"
        ? isZh
          ? "退出圈子"
          : "Leave circle"
        : isZh
          ? "解散圈子"
          : "Disband circle";

  const description =
    action.type === "remove-member"
      ? isZh
        ? `确认将成员“${action.displayName}”移出当前圈子吗？`
        : `Remove "${action.displayName}" from this circle?`
      : action.type === "leave-circle"
        ? isZh
          ? "确认退出当前圈子吗？退出后将不再参与这个圈子的排行榜。"
          : "Leave the current circle? You will no longer appear on this circle leaderboard."
        : isZh
          ? "确认解散当前圈子吗？解散后该圈子的成员关系和排行榜记录都会被删除。"
          : "Disband this circle? Membership and leaderboard records for this circle will be deleted.";

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
            aria-label={isZh ? "关闭" : "Close"}
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
            {isZh ? "取消" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[14px] border border-rose-200/30 bg-rose-300/10 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:-translate-y-px hover:bg-rose-300/16"
          >
            {isZh ? "确认" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
