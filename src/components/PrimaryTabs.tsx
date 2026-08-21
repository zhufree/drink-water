import { useI18n } from "../i18n";
import type { TabKey } from "../hooks/appControllerConfig";

type PrimaryTabsProps = {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
};

export function PrimaryTabs({ activeTab, onChange }: PrimaryTabsProps) {
  const { t } = useI18n();

  const tabs = [
    { key: "today", label: t("tabs.today") },
    { key: "activity", label: t("tabs.activity") },
    { key: "history", label: t("tabs.history") },
    { key: "leaderboard", label: t("tabs.leaderboard") }
  ] as const;

  return (
    <nav aria-label={t("tabs.navigation")} className="mb-3 grid grid-cols-4 gap-2">
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.key}
          onClick={() => onChange(tab.key)}
          aria-current={activeTab === tab.key ? "page" : undefined}
          className={`rounded-[14px] px-2 py-2.5 text-sm font-semibold transition ${
            activeTab === tab.key
              ? "no-text-clarity bg-gradient-to-r from-sky-300 to-blue-500 text-slate-950"
              : "border border-white/8 bg-white/5 text-slate-100 hover:bg-white/8"
          }`}
        >
          <span className="text-clarity">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
