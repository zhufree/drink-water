import { useI18n } from "../i18n";

type TabKey = "today" | "history" | "settings";

type WindowChromeProps = {
  activeTab: TabKey;
  onOpenSettings: () => void;
  onMinimize: () => void;
  onHide: () => void;
};

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.3 3.2h3.4l.5 2.1c.4.1.9.3 1.3.5l1.9-1.1 2.4 2.4-1.1 1.9c.2.4.4.8.5 1.3l2.1.5v3.4l-2.1.5c-.1.5-.3.9-.5 1.3l1.1 1.9-2.4 2.4-1.9-1.1c-.4.2-.8.4-1.3.5l-.5 2.1h-3.4l-.5-2.1c-.5-.1-.9-.3-1.3-.5l-1.9 1.1-2.4-2.4 1.1-1.9a5 5 0 0 1-.5-1.3l-2.1-.5v-3.4l2.1-.5c.1-.5.3-.9.5-1.3L4.6 7l2.4-2.4 1.9 1.1c.4-.2.8-.4 1.3-.5l.1-2Z"
      />
      <circle cx="12" cy="12" r="3.1" />
    </svg>
  );
}

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
            <strong className="block text-[13px] font-semibold text-slate-50" data-tauri-drag-region>
              Drink Water
            </strong>
            <span className="block text-[11px] text-slate-300/80" data-tauri-drag-region>
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
          <SettingsIcon />
        </button>
        <button
          type="button"
          aria-label={t("window.minimize")}
          onClick={onMinimize}
          className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/8 text-sm text-slate-200 transition hover:bg-white/14"
        >
          -
        </button>
        <button
          type="button"
          aria-label={t("window.hideToTray")}
          onClick={onHide}
          className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/8 text-sm text-slate-200 transition hover:bg-white/14"
        >
          x
        </button>
      </div>
    </header>
  );
}
