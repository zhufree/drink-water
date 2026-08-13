import assert from "node:assert/strict";
import { test } from "node:test";
import { validateAchievementReceipt } from "./sync.ts";

const unlockedAt = "2026-06-08T08:30:00.000Z";
const validReceipts = [
  ["first_sip", { kind: "daily", endDay: "2026-05-01", value: 1 }],
  ["first_goal", { kind: "daily", endDay: "2026-05-01", value: 1 }],
  ["first_reminder_answer", { kind: "daily", endDay: "2026-05-01", value: 1 }],
  ["drink_streak_7", { kind: "streak", startDay: "2026-05-01", endDay: "2026-05-07", value: 7 }],
  ["goal_streak_7", { kind: "streak", startDay: "2026-05-01", endDay: "2026-05-07", value: 7 }],
  ["drink_streak_30", { kind: "streak", startDay: "2026-05-01", endDay: "2026-05-30", value: 30 }],
  ["first_plant", { kind: "garden", value: 1 }],
  ["first_harvest", { kind: "collection", value: 1 }],
  ["harvest_10", { kind: "collection", value: 10 }],
  ["same_crop_5", { kind: "collection", cropType: "carrot", value: 5 }],
  ["crop_varieties_3", { kind: "collection", value: 3 }],
  ["first_background", { kind: "background", value: 1 }]
];

test("all twelve achievement receipts pass semantic validation", () => {
  for (const [achievementId, evidence] of validReceipts) {
    assert.deepEqual(
      validateAchievementReceipt({ achievementId, unlockedAt, evidence }),
      { achievementId, unlockedAt, evidence }
    );
  }
});

test("null optional evidence fields from desktop clients are treated as absent", () => {
  assert.deepEqual(
    validateAchievementReceipt({
      achievementId: "first_sip",
      unlockedAt,
      evidence: {
        kind: "daily",
        startDay: null,
        endDay: "2026-05-01",
        cropType: null,
        value: 1
      }
    }),
    {
      achievementId: "first_sip",
      unlockedAt,
      evidence: { kind: "daily", endDay: "2026-05-01", value: 1 }
    }
  );
});

test("invalid and semantically mismatched evidence is rejected", () => {
  const invalidReceipts = [
    null,
    {},
    { achievementId: "not_real", unlockedAt, evidence: { kind: "daily" } },
    { achievementId: "first_sip", unlockedAt: "June 8, 2026", evidence: { kind: "daily" } },
    { achievementId: "first_sip", unlockedAt, evidence: { kind: "invalid" } },
    { achievementId: "first_sip", unlockedAt, evidence: { kind: "daily", startDay: "2026-02-30" } },
    { achievementId: "first_sip", unlockedAt, evidence: { kind: "daily", value: 1 } },
    { achievementId: "drink_streak_7", unlockedAt, evidence: { kind: "streak", startDay: "2026-05-01", endDay: "2026-05-08", value: 7 } },
    { achievementId: "drink_streak_30", unlockedAt, evidence: { kind: "streak", startDay: "2026-05-01", endDay: "2026-05-30", value: 29 } },
    { achievementId: "same_crop_5", unlockedAt, evidence: { kind: "collection", value: 5 } },
    { achievementId: "same_crop_5", unlockedAt, evidence: { kind: "collection", cropType: 123, value: 5 } },
    { achievementId: "harvest_10", unlockedAt, evidence: { kind: "collection", value: 9 } },
    { achievementId: "first_background", unlockedAt, evidence: { kind: "garden", value: 1 } },
    { achievementId: "first_sip", unlockedAt, evidence: { kind: "daily", endDay: "2026-05-01", value: 1, unexpected: true } }
  ];
  for (const receipt of invalidReceipts) {
    assert.throws(() => validateAchievementReceipt(receipt));
  }
});
