import type { CircleSummary, HistoryItem } from "../types";

export function upsertCircle(circles: CircleSummary[], circle: CircleSummary) {
  const existing = circles.find((item) => item.circleCode === circle.circleCode);
  if (existing) {
    return circles.map((item) =>
      item.circleCode === circle.circleCode
        ? {
            ...item,
            circleName: circle.circleName
          }
        : item
    );
  }

  return [circle, ...circles];
}

export function findYesterdayCatchUpCandidate(history: HistoryItem[]) {
  const yesterdayKey = dayKeyOffset(-1);
  return history.find(
    (item) => item.dayKey === yesterdayKey && item.actualIntakeMl < item.targetMl
  ) ?? null;
}

export function buildYesterdayCatchUpPromptItem(history: HistoryItem[], fallbackTargetMl: number) {
  const yesterdayKey = dayKeyOffset(-1);
  return (
    history.find((item) => item.dayKey === yesterdayKey) ?? {
      dayKey: yesterdayKey,
      targetMl: fallbackTargetMl,
      actualIntakeMl: 0,
      consumedMl: 0,
      debtIncurredMl: 0,
      goalMet: false,
      completedReminderSlots: 0,
      missedReminderSlots: 0
    }
  );
}

export function dayKeyOffset(offsetDays: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return formatLocalDayKey(date);
}

export function currentDayKey() {
  return dayKeyOffset(0);
}

export function formatLocalDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function extractErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Failed to sync circles.";
}
