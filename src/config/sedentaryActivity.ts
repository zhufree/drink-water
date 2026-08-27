export const MIN_SLEEP_SEGMENT_MS = 6 * 60 * 60 * 1000;
export const MIN_SLEEP_WINDOW_OVERLAP_MS = 2 * 60 * 60 * 1000;

export function isLikelySleepSegment(
  kind: "seated" | "standing",
  startedAt: number,
  endedAt: number
) {
  if (
    kind !== "standing" ||
    !Number.isFinite(startedAt) ||
    !Number.isFinite(endedAt) ||
    endedAt - startedAt < MIN_SLEEP_SEGMENT_MS
  ) {
    return false;
  }

  let sleepWindowOverlapMs = 0;
  const day = new Date(startedAt);
  day.setHours(0, 0, 0, 0);

  while (day.getTime() < endedAt) {
    const windowStart = new Date(day);
    windowStart.setHours(2, 0, 0, 0);
    const windowEnd = new Date(day);
    windowEnd.setHours(6, 0, 0, 0);
    sleepWindowOverlapMs += Math.max(
      0,
      Math.min(endedAt, windowEnd.getTime()) - Math.max(startedAt, windowStart.getTime())
    );
    if (sleepWindowOverlapMs >= MIN_SLEEP_WINDOW_OVERLAP_MS) {
      return true;
    }
    day.setDate(day.getDate() + 1);
  }

  return false;
}
