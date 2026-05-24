import { useI18n } from "../i18n";

type PrimaryTabsProps = {
  activeTab: "today" | "history" | "leaderboard" | "settings";
  onChange: (tab: "today" | "history" | "leaderboard") => void;
};

export function PrimaryTabs({ activeTab, onChange }: PrimaryTabsProps) {
  const { t } = useI18n();

  const tabs = [
    { key: "today", label: t("tabs.today") },
    { key: "history", label: t("tabs.history") },
    { key: "leaderboard", label: t("tabs.leaderboard") }
  ] as const;

  return (
    <nav aria-label={t("tabs.navigation")} className="mb-3 grid grid-cols-3 gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`rounded-[14px] px-3 py-2.5 text-base font-semibold transition ${
            activeTab === tab.key
              ? "bg-gradient-to-r from-sky-300 to-blue-500 text-slate-950"
              : "bg-white/7 text-slate-100 hover:-translate-y-px"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
