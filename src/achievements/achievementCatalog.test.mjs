import assert from "node:assert/strict";
import test from "node:test";
import {
  ACHIEVEMENT_CATALOG,
  buildAchievementViewModels,
  getAchievementProgress
} from "./achievementCatalog.ts";

const history = [
  {
    dayKey: "2026-08-12",
    targetMl: 2000,
    actualIntakeMl: 1000,
    consumedMl: 1000,
    debtIncurredMl: 0,
    goalMet: false,
    completedReminderSlots: 1,
    missedReminderSlots: 0
  },
  {
    dayKey: "2026-08-11",
    targetMl: 2000,
    actualIntakeMl: 2000,
    consumedMl: 2000,
    debtIncurredMl: 0,
    goalMet: true,
    completedReminderSlots: 2,
    missedReminderSlots: 0
  }
];

const garden = {
  initialGrantClaimed: true,
  initialGrantLastAwardedAt: null,
  produceMigrationClaimed: true,
  seeds: [],
  produce: [],
  crops: [],
  collection: [
    { cropType: "potato", harvestCount: 4 },
    { cropType: "carrot", harvestCount: 2 },
    { cropType: "onion", harvestCount: 1 }
  ],
  activeBackground: "default",
  unlockedBackgrounds: ["catCollage"],
  rest: {
    active: false,
    startedAt: null,
    endsAt: null,
    cooldownEndsAt: null,
    maxDurationSeconds: 0,
    plannedBoostSeconds: 0
  }
};

test("catalog exposes twelve stable ids and maps simple and hard frames", () => {
  assert.equal(ACHIEVEMENT_CATALOG.length, 12);
  assert.equal(new Set(ACHIEVEMENT_CATALOG.map((item) => item.id)).size, 12);
  assert.equal(ACHIEVEMENT_CATALOG.find((item) => item.id === "first_sip")?.tier, "simple");
  assert.equal(
    ACHIEVEMENT_CATALOG.find((item) => item.id === "drink_streak_30")?.tier,
    "hard"
  );
});

test("progress uses historical and cumulative garden evidence without inventory guesses", () => {
  assert.deepEqual(getAchievementProgress("first_sip", history, garden), {
    current: 1,
    target: 1
  });
  assert.deepEqual(getAchievementProgress("harvest_10", history, garden), {
    current: 7,
    target: 10
  });
  assert.deepEqual(getAchievementProgress("crop_varieties_3", history, garden), {
    current: 3,
    target: 3
  });
});

test("view models prefer permanent receipts and sort newest unlocked first", () => {
  const receipts = [
    {
      achievementId: "first_sip",
      unlockedAt: "2026-08-01T09:00:00+08:00",
      evidence: { kind: "daily", endDay: "2026-08-01", value: 250 }
    },
    {
      achievementId: "first_goal",
      unlockedAt: "2026-08-02T09:00:00+08:00",
      evidence: { kind: "daily", endDay: "2026-08-02", value: 2000 }
    }
  ];

  const models = buildAchievementViewModels(receipts, history, garden);
  assert.deepEqual(
    models.filter((item) => item.isUnlocked).map((item) => item.id),
    ["first_goal", "first_sip"]
  );
  assert.equal(models.find((item) => item.id === "first_sip")?.frame, "simple");
  assert.equal(models.find((item) => item.id === "drink_streak_7")?.frame, "hard");
});
