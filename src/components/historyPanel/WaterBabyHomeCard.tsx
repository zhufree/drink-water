import { Check, Hammer, Mountain, Trees } from "lucide-react";
import type { GardenState } from "../../types";
import {
  GARDEN_PROJECTS,
  isGardenProjectBuildable
} from "../../config/waterBaby";
import { useI18n } from "../../i18n";

type WaterBabyHomeCardProps = {
  gardenState: GardenState;
  onBuildProject: (projectId: string) => void;
};

export function WaterBabyHomeCard({
  gardenState,
  onBuildProject
}: WaterBabyHomeCardProps) {
  const { t } = useI18n();
  const { materials, completedProjectIds } = gardenState.waterBaby;

  const projectName = (projectId: string) => {
    switch (projectId) {
      case "mountainSteps":
        return t("waterBaby.project.mountainSteps");
      case "riversidePier":
        return t("waterBaby.project.riversidePier");
      default:
        return t("waterBaby.project.forestBridge");
    }
  };

  return (
    <article className="panel-surface rounded-[22px] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="m-0 text-base font-semibold text-slate-50">
            {t("waterBaby.projectsTitle")}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-300/72">
            {t("waterBaby.projectsDescription")}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <span className="rounded-full border border-amber-200/16 bg-amber-300/10 px-2.5 py-1 text-xs font-semibold text-amber-100">
            {t("waterBaby.wood")} {materials.wood}
          </span>
          <span className="rounded-full border border-slate-200/16 bg-slate-200/8 px-2.5 py-1 text-xs font-semibold text-slate-100">
            {t("waterBaby.stone")} {materials.stone}
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {GARDEN_PROJECTS.map((project, index) => {
          const built = completedProjectIds.includes(project.id);
          const buildable = isGardenProjectBuildable(
            project.id,
            materials,
            completedProjectIds
          );
          const Icon = index === 0 ? Trees : index === 1 ? Mountain : Hammer;

          return (
            <div
              key={project.id}
              className={`flex items-center gap-3 rounded-[16px] border p-3 ${
                built
                  ? "border-emerald-200/18 bg-emerald-300/8"
                  : "border-white/8 bg-white/4"
              }`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-slate-950/22 text-sky-200">
                {built ? <Check size={20} /> : <Icon size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-sm font-semibold text-slate-100">
                  {projectName(project.id)}
                </p>
                <p className="mt-1 text-[11px] text-slate-300/65">
                  {t("waterBaby.needs", {
                    wood: project.woodCost,
                    stone: project.stoneCost
                  })}
                </p>
              </div>
              <button
                type="button"
                disabled={built || !buildable}
                onClick={() => onBuildProject(project.id)}
                className="shrink-0 rounded-[12px] border border-sky-200/18 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/16 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {built ? t("waterBaby.built") : t("waterBaby.build")}
              </button>
            </div>
          );
        })}
      </div>
    </article>
  );
}
