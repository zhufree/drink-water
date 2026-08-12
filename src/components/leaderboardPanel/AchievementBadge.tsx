import { LockKeyhole } from "lucide-react";
import simpleFrame from "../../assets/achievements/badge-frame-blue-v2-gloss.png";
import hardFrame from "../../assets/achievements/badge-frame-blue.png";
import { getAchievementIconUrl } from "../../achievements/achievementAssets";
import type { AchievementViewModel } from "../../achievements/achievementCatalog";

type AchievementBadgeProps = {
  achievement: AchievementViewModel;
  sizeClass?: string;
};

export function AchievementBadge({
  achievement,
  sizeClass = "h-16 w-16"
}: AchievementBadgeProps) {
  const iconUrl = getAchievementIconUrl(achievement.id);
  const frameUrl = achievement.frame === "hard" ? hardFrame : simpleFrame;

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center ${sizeClass}`}
      aria-hidden="true"
    >
      <span
        className={`absolute inset-[17%] overflow-hidden rounded-full bg-slate-800 transition ${
          achievement.isUnlocked ? "" : "grayscale opacity-36"
        }`}
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <span className="block h-full w-full bg-gradient-to-br from-sky-200/70 to-blue-700/70" />
        )}
      </span>
      <img
        src={frameUrl}
        alt=""
        className={`absolute inset-0 h-full w-full object-contain transition ${
          achievement.isUnlocked ? "" : "grayscale opacity-46"
        }`}
        draggable={false}
      />
      {!achievement.isUnlocked ? (
        <span className="absolute grid h-6 w-6 place-items-center rounded-full border border-white/12 bg-slate-950/86 text-slate-300">
          <LockKeyhole className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      ) : null}
    </span>
  );
}
