import { Droplets, Footprints } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../i18n";
import type { SedentaryActivityEvent, SedentaryStatus } from "../types";
import { ActivityPanel } from "./ActivityPanel";
import { TodayPanel, type TodayPanelProps } from "./TodayPanel";

type TodaySection = "water" | "activity";

type TodayDashboardProps = {
  water: TodayPanelProps;
  sedentaryStatus: SedentaryStatus;
  onAddActivityEvent: (
    kind: SedentaryActivityEvent["kind"],
    at: string
  ) => Promise<boolean>;
  onEditActivityEvent: (
    originalAt: string,
    kind: SedentaryActivityEvent["kind"],
    at: string
  ) => Promise<boolean>;
  onDeleteActivityEvent: (at: string) => Promise<boolean>;
};

export function TodayDashboard({
  water,
  sedentaryStatus,
  onAddActivityEvent,
  onEditActivityEvent,
  onDeleteActivityEvent
}: TodayDashboardProps) {
  const { t } = useI18n();
  const [section, setSection] = useState<TodaySection>("water");
  const tabs = [
    { key: "water", label: t("todaySections.water"), icon: Droplets },
    { key: "activity", label: t("todaySections.activity"), icon: Footprints }
  ] as const;

  return (
    <div>
      <nav
        aria-label={t("todaySections.navigation")}
        className="mb-3 grid grid-cols-2 gap-1 rounded-[16px] border border-white/8 bg-slate-950/28 p-1"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={active}
              onClick={() => setSection(tab.key)}
              className={`flex items-center justify-center gap-2 rounded-[12px] px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-sky-300 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:bg-white/6 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div>
        {section === "water" ? (
          <TodayPanel {...water} />
        ) : (
          <ActivityPanel
            status={sedentaryStatus}
            onAddEvent={onAddActivityEvent}
            onEditEvent={onEditActivityEvent}
            onDeleteEvent={onDeleteActivityEvent}
          />
        )}
      </div>
    </div>
  );
}
