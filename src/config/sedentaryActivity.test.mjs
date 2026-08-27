import assert from "node:assert/strict";
import test from "node:test";

import { isLikelySleepSegment } from "./sedentaryActivity.ts";

const localTime = (day, hour, minute = 0) =>
  new Date(2026, 7, day, hour, minute).getTime();

test("a long standing segment across the overnight sleep window is classified as sleep", () => {
  assert.equal(
    isLikelySleepSegment("standing", localTime(18, 23), localTime(19, 8)),
    true
  );
});

test("short overnight standing and long daytime standing remain standing", () => {
  assert.equal(
    isLikelySleepSegment("standing", localTime(19, 2), localTime(19, 5, 59)),
    false
  );
  assert.equal(
    isLikelySleepSegment("standing", localTime(19, 8), localTime(19, 16)),
    false
  );
});

test("a long segment needs meaningful overlap with the 2am to 6am window", () => {
  assert.equal(
    isLikelySleepSegment("standing", localTime(19, 5), localTime(19, 13)),
    false
  );
  assert.equal(
    isLikelySleepSegment("standing", localTime(19, 1), localTime(19, 7)),
    true
  );
});

test("sitting segments are never classified as sleep", () => {
  assert.equal(
    isLikelySleepSegment("seated", localTime(18, 23), localTime(19, 8)),
    false
  );
});
