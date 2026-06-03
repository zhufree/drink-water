import { Minus, Settings, X } from "lucide-react";
import { useI18n } from "../i18n";

type TabKey = "today" | "history" | "leaderboard" | "settings";

type WindowChromeProps = {
  activeTab: TabKey;
  onOpenSettings: () => void;
  onMinimize: () => void;
  onHide: () => void;
};

export function WindowChrome({
  activeTab,
  onOpenSettings,
  onMinimize,
  onHide
}: WindowChromeProps) {
  const { t } = useI18n();

  return (
    <header className="mb-3 flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-white/5 px-3 py-2 backdrop-blur-md select-none">
      <div className="min-w-0 flex-1" data-tauri-drag-region>
        <div className="flex items-center gap-3" data-tauri-drag-region>
          <span
            className="h-3 w-3 rounded-full bg-gradient-to-br from-cyan-300 to-emerald-300 shadow-[0_0_16px_rgba(114,208,255,0.48)]"
            data-tauri-drag-region
          />
          <div data-tauri-drag-region>
            <strong className="text-clarity block text-[13px] font-semibold text-slate-50" data-tauri-drag-region>
              Drink Water
            </strong>
            <span className="text-clarity block text-[11px] text-slate-300/80" data-tauri-drag-region>
              {t("window.subtitle")}
            </span>
          </div>
        </div>
      </div>

      <div className="no-drag flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={t("window.openSettings")}
          onClick={onOpenSettings}
          className={`flex h-8 w-8 items-center justify-center rounded-[10px] transition ${
            activeTab === "settings"
              ? "bg-cyan-300/15 text-cyan-200"
              : "bg-white/8 text-slate-200 hover:bg-white/14"
          }`}
        >
          <Settings className="icon-clarity h-4 w-4" strokeWidth={1.9} />
        </button>
        <button
          type="button"
          aria-label={t("window.minimize")}
          onClick={onMinimize}
          className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/8 text-sm text-slate-200 transition hover:bg-white/14"
        >
          <Minus className="icon-clarity h-4 w-4" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          aria-label={t("window.hideToTray")}
          onClick={onHide}
          className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/8 text-sm text-slate-200 transition hover:bg-white/14"
        >
          <X className="icon-clarity h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>
    </header>
  );
}
