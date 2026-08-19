import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_EXPEDITION_ROUTE_ID,
  FOREST_BRIDGE_PROJECT_ID,
  getExpeditionTier,
  getUnlockedExpeditionRoutes,
  isGardenProjectBuildable,
  shouldShowWaterBabyEntry
} from "./waterBaby.ts";

test("expedition tier is capped by daily goal progress", () => {
  assert.equal(getExpeditionTier(0, 2000), "locked");
  assert.equal(getExpeditionTier(1, 2000), "short");
  assert.equal(getExpeditionTier(1999, 2000), "short");
  assert.equal(getExpeditionTier(2000, 2000), "long");
  assert.equal(getExpeditionTier(4000, 2000), "long");
});

test("completed projects unlock routes while the nearby path is always available", () => {
  assert.deepEqual(
    getUnlockedExpeditionRoutes([]).map((route) => route.id),
    [DEFAULT_EXPEDITION_ROUTE_ID]
  );
  assert.deepEqual(
    getUnlockedExpeditionRoutes([FOREST_BRIDGE_PROJECT_ID]).map((route) => route.id),
    [DEFAULT_EXPEDITION_ROUTE_ID, "forestTrail"]
  );
});

test("a project is buildable only once and only with enough materials", () => {
  assert.equal(
    isGardenProjectBuildable(FOREST_BRIDGE_PROJECT_ID, { wood: 8, stone: 4 }, []),
    true
  );
  assert.equal(
    isGardenProjectBuildable(FOREST_BRIDGE_PROJECT_ID, { wood: 7, stone: 4 }, []),
    false
  );
  assert.equal(
    isGardenProjectBuildable(
      FOREST_BRIDGE_PROJECT_ID,
      { wood: 8, stone: 4 },
      [FOREST_BRIDGE_PROJECT_ID]
    ),
    false
  );
});

test("the progress bubble reveals the water baby once exploration is available", () => {
  assert.equal(shouldShowWaterBabyEntry(0, 2000, false), false);
  assert.equal(shouldShowWaterBabyEntry(1, 2000, false), true);
  assert.equal(shouldShowWaterBabyEntry(2000, 2000, false), true);
});

test("an active expedition keeps the water baby entry visible after goal changes", () => {
  assert.equal(shouldShowWaterBabyEntry(400, 2000, true), true);
});
