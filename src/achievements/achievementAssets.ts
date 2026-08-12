import type { AchievementId } from "../types";

const iconModules = import.meta.glob("../assets/achievements/icons/*.png", {
  eager: true,
  query: "?url",
  import: "default"
}) as Record<string, string>;

export function getAchievementIconUrl(id: AchievementId) {
  return iconModules[`../assets/achievements/icons/${id}.png`] ?? "";
}
