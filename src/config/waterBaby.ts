export const DEFAULT_EXPEDITION_ROUTE_ID = "nearbyPath";
export const FOREST_EXPEDITION_ROUTE_ID = "forestTrail";
export const MOUNTAIN_EXPEDITION_ROUTE_ID = "mountainPath";
export const RIVERSIDE_EXPEDITION_ROUTE_ID = "riverside";

export const FOREST_BRIDGE_PROJECT_ID = "forestBridge";
export const MOUNTAIN_STEPS_PROJECT_ID = "mountainSteps";
export const RIVERSIDE_PIER_PROJECT_ID = "riversidePier";

export type ExpeditionTier = "locked" | "short" | "long";
export type GardenMaterials = { wood: number; stone: number };

export type ExpeditionRouteDefinition = {
  id: string;
  requiredProjectId: string | null;
};

export type GardenProjectDefinition = {
  id: string;
  routeId: string;
  woodCost: number;
  stoneCost: number;
};

export const EXPEDITION_ROUTES: ExpeditionRouteDefinition[] = [
  { id: DEFAULT_EXPEDITION_ROUTE_ID, requiredProjectId: null },
  { id: FOREST_EXPEDITION_ROUTE_ID, requiredProjectId: FOREST_BRIDGE_PROJECT_ID },
  { id: MOUNTAIN_EXPEDITION_ROUTE_ID, requiredProjectId: MOUNTAIN_STEPS_PROJECT_ID },
  { id: RIVERSIDE_EXPEDITION_ROUTE_ID, requiredProjectId: RIVERSIDE_PIER_PROJECT_ID }
];

export const GARDEN_PROJECTS: GardenProjectDefinition[] = [
  {
    id: FOREST_BRIDGE_PROJECT_ID,
    routeId: FOREST_EXPEDITION_ROUTE_ID,
    woodCost: 8,
    stoneCost: 4
  },
  {
    id: MOUNTAIN_STEPS_PROJECT_ID,
    routeId: MOUNTAIN_EXPEDITION_ROUTE_ID,
    woodCost: 4,
    stoneCost: 10
  },
  {
    id: RIVERSIDE_PIER_PROJECT_ID,
    routeId: RIVERSIDE_EXPEDITION_ROUTE_ID,
    woodCost: 10,
    stoneCost: 8
  }
];

export function getExpeditionTier(actualIntakeMl: number, targetMl: number): ExpeditionTier {
  if (targetMl <= 0 || actualIntakeMl * 2 < targetMl) {
    return "locked";
  }
  return actualIntakeMl >= targetMl ? "long" : "short";
}

export function shouldShowWaterBabyEntry(
  actualIntakeMl: number,
  targetMl: number,
  hasActiveExpedition: boolean
) {
  return hasActiveExpedition || getExpeditionTier(actualIntakeMl, targetMl) !== "locked";
}

export function getUnlockedExpeditionRoutes(completedProjectIds: string[]) {
  const completed = new Set(completedProjectIds);
  return EXPEDITION_ROUTES.filter(
    (route) => route.requiredProjectId === null || completed.has(route.requiredProjectId)
  );
}

export function isGardenProjectBuildable(
  projectId: string,
  materials: GardenMaterials,
  completedProjectIds: string[]
) {
  const project = GARDEN_PROJECTS.find((candidate) => candidate.id === projectId);
  return Boolean(
    project &&
      !completedProjectIds.includes(project.id) &&
      materials.wood >= project.woodCost &&
      materials.stone >= project.stoneCost
  );
}
