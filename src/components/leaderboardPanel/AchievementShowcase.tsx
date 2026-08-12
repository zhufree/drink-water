import { useMemo, useState } from "react";
import { Award, ChevronDown } from "lucide-react";
import { buildAchievementViewModels } from "../../achievements/achievementCatalog";
import type { AchievementReceipt, GardenState, HistoryItem } from "../../types";
import { useI18n } from "../../i18n";
import { AchievementBadge } from "./AchievementBadge";

type AchievementShowcaseProps = {
  receipts: AchievementReceipt[];
  history: HistoryItem[];
  garden: GardenState;
};

export function AchievementShowcase({
  receipts,
  history,
  garden
}: AchievementShowcaseProps) {
  const { t, formatDateTime, achievementName, achievementDescription } = useI18n();
  const [open, setOpen] = useState(false);
  const achievements = useMemo(
    () => buildAchievementViewModels(receipts, history, garden),
    [garden, history, receipts]
  );
  const unlocked = achievements.filter((item) => item.isUnlocked);
  const preview = unlocked.slice(0, 3);

  return (
    <section className="my-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="achievement-list"
        className="panel-surface flex w-full items-center gap-3 rounded-[22px] border border-sky-200/16 p-3 text-left transition hover:-translate-y-px hover:border-sky-200/28"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-300/12 text-sky-100">
          <Award className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm font-semibold text-slate-50">
            {t("achievements.title")}
          </strong>
          <span className="mt-0.5 block text-xs text-slate-300/76">
            {t("achievements.summary", {
              unlocked: unlocked.length,
              total: achievements.length
            })}
          </span>
        </span>
        {preview.length > 0 ? (
          <span className="flex -space-x-2">
            {preview.map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                sizeClass="h-9 w-9"
              />
            ))}
          </span>
        ) : (
          <span className="text-xs text-slate-400">{t("achievements.empty")}</span>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-sky-100/76 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <div id="achievement-list" className="mt-3 grid grid-cols-2 gap-3">
          {achievements.map((achievement) => {
            const percent = Math.min(
              100,
              Math.round(
                (achievement.progress.current / achievement.progress.target) * 100
              )
            );
            return (
              <article
                key={achievement.id}
                className={`rounded-[18px] border p-3 ${
                  achievement.isUnlocked
                    ? "border-sky-200/16 bg-sky-300/8"
                    : "border-white/8 bg-white/4"
                }`}
              >
                <div className="flex justify-center">
                  <AchievementBadge achievement={achievement} sizeClass="h-24 w-24" />
                </div>
                <h4 className="mt-2 text-center text-sm font-semibold text-slate-50">
                  {achievementName(achievement.id)}
                </h4>
                <p className="mt-1 min-h-10 text-center text-xs leading-5 text-slate-300/74">
                  {achievementDescription(achievement.id)}
                </p>
                {achievement.isUnlocked ? (
                  <p className="mt-2 text-center text-[11px] font-medium text-cyan-100/82">
                    {t("achievements.unlockedAt", {
                      time: formatDateTime(achievement.unlockedAt)
                    })}
                  </p>
                ) : (
                  <div className="mt-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-300 to-blue-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-center text-[11px] text-slate-400">
                      {t("achievements.progress", {
                        current: achievement.progress.current,
                        target: achievement.progress.target
                      })}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
