import {
  Armchair,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Footprints,
  Moon,
  Pencil,
  PersonStanding,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { isLikelySleepSegment } from "../config/sedentaryActivity";
import type { SedentaryActivityEvent, SedentaryStatus } from "../types";

type ActivityPanelProps = {
  status: SedentaryStatus;
  onAddEvent: (kind: SedentaryActivityEvent["kind"], at: string) => Promise<boolean>;
  onEditEvent: (
    originalAt: string,
    kind: SedentaryActivityEvent["kind"],
    at: string
  ) => Promise<boolean>;
  onDeleteEvent: (at: string) => Promise<boolean>;
};

type ActivitySegment = {
  event: SedentaryActivityEvent;
  kind: SedentaryActivityEvent["kind"] | "sleeping";
  durationMs: number;
};

const LONG_SITTING_MS = 30 * 60 * 1000;
const RETAINED_DAY_COUNT = 7;

function parseDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dayKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function recentDayKeys(currentDayKey: string) {
  const current = parseDayKey(currentDayKey);
  return Array.from({ length: RETAINED_DAY_COUNT }, (_, index) => {
    const date = new Date(current);
    date.setDate(current.getDate() - index);
    return dayKeyFromDate(date);
  });
}

function formatTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function formatInputTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function eventDayKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dayKeyFromDate(date);
}

export function ActivityPanel({
  status,
  onAddEvent,
  onEditEvent,
  onDeleteEvent
}: ActivityPanelProps) {
  const { locale, t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  const [dayOffset, setDayOffset] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [eventKind, setEventKind] = useState<SedentaryActivityEvent["kind"]>("seated");
  const [eventTime, setEventTime] = useState("");
  const [editorError, setEditorError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingAt, setEditingAt] = useState<string | null>(null);
  const [deletingAt, setDeletingAt] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const currentDayKey = status.activityDayKey || dayKeyFromDate(new Date(now));
  const dayKeys = useMemo(() => recentDayKeys(currentDayKey), [currentDayKey]);
  const selectedDayKey = dayKeys[dayOffset] ?? currentDayKey;
  const isToday = selectedDayKey === currentDayKey;
  const selectedDate = useMemo(() => parseDayKey(selectedDayKey), [selectedDayKey]);
  const dateLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(selectedDate);

  useEffect(() => {
    setDayOffset(0);
  }, [currentDayKey]);

  useEffect(() => {
    setEditorOpen(false);
    setEditingAt(null);
    setEditorError("");
  }, [selectedDayKey]);

  const activityEvents = useMemo(() => {
    const source = isToday
      ? status.activityEvents
      : status.activityHistory.find((item) => item.dayKey === selectedDayKey)?.activityEvents ?? [];

    return source
      .filter(
        (event) =>
          Number.isFinite(new Date(event.at).getTime()) && eventDayKey(event.at) === selectedDayKey
      )
      .sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());
  }, [isToday, selectedDayKey, status.activityEvents, status.activityHistory]);

  const timelineEnd = useMemo(() => {
    if (isToday) {
      return now;
    }
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.getTime();
  }, [isToday, now, selectedDate]);

  const segments = useMemo<ActivitySegment[]>(() => {
    return activityEvents.map((event, index) => {
      const startedAt = new Date(event.at).getTime();
      const nextEvent = activityEvents[index + 1];
      const endedAt = nextEvent ? new Date(nextEvent.at).getTime() : timelineEnd;
      const durationMs = Math.max(0, endedAt - startedAt);
      return {
        event,
        kind: isLikelySleepSegment(event.kind, startedAt, endedAt) ? "sleeping" : event.kind,
        durationMs
      };
    });
  }, [activityEvents, timelineEnd]);

  const totals = useMemo(() => {
    let sittingMs = 0;
    let standingMs = 0;
    let longestSittingMs = 0;

    for (const segment of segments) {
      if (segment.kind === "seated") {
        sittingMs += segment.durationMs;
        longestSittingMs = Math.max(longestSittingMs, segment.durationMs);
      } else if (segment.kind === "standing") {
        standingMs += segment.durationMs;
      }
    }

    return { sittingMs, standingMs, longestSittingMs };
  }, [segments]);

  const formatDuration = (durationMs: number) => {
    const totalMinutes = Math.floor(durationMs / 60_000);
    if (durationMs <= 0) {
      return t("activity.minutes", { minutes: 0 });
    }
    if (totalMinutes < 1) {
      return t("activity.lessThanMinute");
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0
      ? t("activity.hoursMinutes", { hours, minutes })
      : t("activity.minutes", { minutes });
  };

  const openEditor = (event?: SedentaryActivityEvent) => {
    const lastEvent = activityEvents[activityEvents.length - 1];
    const suggested = event
      ? new Date(event.at)
      : lastEvent
        ? new Date(Math.min(new Date(lastEvent.at).getTime() + 60_000, timelineEnd - 60_000))
        : isToday
          ? new Date(now)
          : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 9);
    setEventKind(event?.kind ?? (lastEvent?.kind === "seated" ? "standing" : "seated"));
    setEventTime(formatInputTime(suggested));
    setEditingAt(event?.at ?? null);
    setEditorError("");
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingAt(null);
    setEditorError("");
  };

  const saveEvent = async () => {
    const [hours, minutes] = eventTime.split(":").map(Number);
    const eventAt = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hours,
      minutes
    );
    if (!eventTime || Number.isNaN(eventAt.getTime()) || eventAt.getTime() > now) {
      setEditorError(t("activity.invalidTime"));
      return;
    }

    setSaving(true);
    setEditorError("");
    const saved = editingAt
      ? await onEditEvent(editingAt, eventKind, eventAt.toISOString())
      : await onAddEvent(eventKind, eventAt.toISOString());
    setSaving(false);
    if (saved) {
      closeEditor();
    }
  };

  const deleteEvent = async (at: string) => {
    if (!window.confirm(t("activity.deleteConfirm"))) {
      return;
    }
    setDeletingAt(at);
    const deleted = await onDeleteEvent(at);
    setDeletingAt(null);
    if (deleted && editingAt === at) {
      closeEditor();
    }
  };

  return (
    <section aria-labelledby="activity-title" className="space-y-3">
      <article className="panel-surface rounded-[18px] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
              {isToday ? t("activity.today") : t("activity.savedDay")}
            </p>
            <h2 id="activity-title" className="mt-1 text-xl font-bold text-white">
              {t("activity.title")}
            </h2>
            <p className="mt-1 text-sm font-medium text-sky-100">{dateLabel}</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              {t("activity.description")}
            </p>
          </div>
          {isToday ? (
            <div
              className={`no-text-clarity flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${
                status.seated
                  ? "border-amber-200/30 bg-amber-300/15 text-amber-100"
                  : "border-emerald-200/30 bg-emerald-300/15 text-emerald-100"
              }`}
            >
              {status.seated ? (
                <Armchair className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PersonStanding className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{status.seated ? t("activity.sittingNow") : t("activity.standingNow")}</span>
            </div>
          ) : (
            <CalendarDays className="h-6 w-6 shrink-0 text-sky-200" aria-hidden="true" />
          )}
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2">
          <Metric label={t("activity.totalSitting")} value={formatDuration(totals.sittingMs)} />
          <Metric label={t("activity.totalStanding")} value={formatDuration(totals.standingMs)} />
          <Metric
            label={t("activity.longestSitting")}
            value={formatDuration(totals.longestSittingMs)}
          />
        </dl>
      </article>

      <article className="panel-surface rounded-[18px] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Clock3 className="h-5 w-5 shrink-0 text-sky-200" aria-hidden="true" />
            <h3 className="truncate text-base font-bold text-white">
              {t("activity.timelineTitle")}
            </h3>
          </div>
          <button
            type="button"
            onClick={editorOpen ? closeEditor : () => openEditor()}
            aria-expanded={editorOpen}
            className="no-text-clarity flex shrink-0 items-center gap-1.5 rounded-[12px] border border-sky-200/20 bg-sky-300/12 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/18"
          >
            {editorOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span className="text-clarity">
              {editorOpen ? t("activity.cancelAdd") : t("activity.addNode")}
            </span>
          </button>
        </div>

        {editorOpen ? (
          <div className="mt-4 rounded-[14px] border border-sky-200/15 bg-slate-950/25 p-3">
            <fieldset>
              <legend className="text-sm font-semibold text-slate-100">
                {t("activity.nodeType")}
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["seated", "standing"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={eventKind === kind}
                    onClick={() => setEventKind(kind)}
                    className={`rounded-[12px] border px-3 py-2.5 text-sm font-semibold transition ${
                      eventKind === kind
                        ? "border-sky-200/35 bg-sky-300/18 text-white"
                        : "border-white/8 bg-white/5 text-slate-300 hover:bg-white/8"
                    }`}
                  >
                    {kind === "seated" ? t("activity.satDown") : t("activity.stoodUp")}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="mt-3 block text-sm font-semibold text-slate-100" htmlFor="activity-event-time">
              {t("activity.nodeTime")}
            </label>
            <input
              id="activity-event-time"
              type="time"
              value={eventTime}
              max={isToday ? formatInputTime(new Date(now)) : undefined}
              onChange={(event) => setEventTime(event.target.value)}
              className="mt-2 w-full rounded-[12px] border border-white/10 bg-slate-950/35 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/55"
            />
            {editorError ? (
              <p className="mt-2 text-xs text-rose-200" role="alert">
                {editorError}
              </p>
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveEvent()}
              className="no-text-clarity mt-3 w-full rounded-[12px] bg-sky-300 px-3 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-sky-200 disabled:cursor-wait disabled:opacity-60"
            >
              <span className="text-clarity">
                {saving ? t("activity.savingNode") : t("activity.saveNode")}
              </span>
            </button>
          </div>
        ) : null}

        {segments.length === 0 ? (
          <div className="py-10 text-center" role="status">
            <Footprints className="mx-auto h-9 w-9 text-slate-500" aria-hidden="true" />
            <h4 className="mt-3 text-sm font-semibold text-slate-100">
              {t("activity.emptyTitle")}
            </h4>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-400">
              {t("activity.emptyDescription")}
            </p>
          </div>
        ) : (
          <ol className="mt-4" aria-label={t("activity.timelineTitle")}>
            {segments.map((segment, index) => {
              const seated = segment.kind === "seated";
              const sleeping = segment.kind === "sleeping";
              const longSitting = seated && segment.durationMs > LONG_SITTING_MS;
              const lineClass = sleeping
                ? "border-indigo-300"
                : seated
                ? longSitting
                  ? "border-rose-400"
                  : "border-amber-300"
                : "border-emerald-400";
              const badgeClass = sleeping
                ? "bg-indigo-300/15 text-indigo-100"
                : seated
                ? longSitting
                  ? "bg-rose-400/15 text-rose-100"
                  : "bg-amber-300/15 text-amber-100"
                : "bg-emerald-400/15 text-emerald-100";

              return (
                <li key={`${segment.event.at}-${index}`}>
                  <div className="grid grid-cols-[32px_72px_1fr] items-center gap-2">
                    <span
                      className={`no-text-clarity flex h-8 w-8 items-center justify-center rounded-full border ${
                        sleeping
                          ? "border-indigo-200/35 bg-indigo-300/15 text-indigo-100"
                          : seated
                          ? "border-amber-200/35 bg-amber-300/15 text-amber-100"
                          : "border-emerald-200/35 bg-emerald-300/15 text-emerald-100"
                      }`}
                    >
                      {sleeping ? (
                        <Moon className="h-4 w-4" aria-hidden="true" />
                      ) : seated ? (
                        <Armchair className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <PersonStanding className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                    <time className="font-mono text-xs text-slate-400" dateTime={segment.event.at}>
                      {formatTime(segment.event.at, locale)}
                    </time>
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-100">
                        {sleeping
                          ? t("activity.sleep")
                          : seated
                            ? t("activity.satDown")
                            : t("activity.stoodUp")}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditor(segment.event)}
                          aria-label={t("activity.editNode")}
                          className="rounded-lg p-1.5 text-sky-200 transition hover:bg-sky-300/12 hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingAt === segment.event.at}
                          onClick={() => void deleteEvent(segment.event.at)}
                          aria-label={t("activity.deleteNode")}
                          className="rounded-lg p-1.5 text-rose-200 transition hover:bg-rose-300/12 hover:text-white disabled:cursor-wait disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    </div>
                  </div>

                  <div className={`ml-[15px] border-l-2 py-3 pl-[25px] ${lineClass}`}>
                    <div className="flex items-center justify-between gap-3 rounded-[12px] bg-slate-950/25 px-3 py-2">
                      <span className="text-xs text-slate-300">
                        {sleeping
                          ? t("activity.sleepingPhase")
                          : seated
                            ? t("activity.sittingPhase")
                            : t("activity.standingPhase")}
                      </span>
                      <span className={`no-text-clarity rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}`}>
                        {formatDuration(segment.durationMs)}
                        {longSitting ? ` · ${t("activity.longSitting")}` : ""}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
            <li className="grid grid-cols-[32px_72px_1fr] items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-300 ring-4 ring-sky-300/15" />
              </span>
              <time className="font-mono text-xs text-slate-400">
                {isToday ? formatTime(new Date(now).toISOString(), locale) : "24:00"}
              </time>
              <span className="text-sm font-semibold text-sky-100">
                {isToday ? t("activity.now") : t("activity.dayEnd")}
              </span>
            </li>
          </ol>
        )}
      </article>

      <nav
        aria-label={t("activity.dateNavigation")}
        className="panel-surface grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[18px] p-3"
      >
        <button
          type="button"
          disabled={dayOffset >= RETAINED_DAY_COUNT - 1}
          onClick={() => setDayOffset((value) => Math.min(RETAINED_DAY_COUNT - 1, value + 1))}
          className="flex items-center justify-center gap-1 rounded-[12px] border border-white/8 bg-white/5 px-2 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span>{t("activity.previousDay")}</span>
        </button>
        <div className="min-w-[92px] text-center">
          <strong className="block text-sm text-white">{dateLabel}</strong>
          <span className="mt-0.5 block text-xs text-slate-400">
            {dayOffset + 1} / {RETAINED_DAY_COUNT}
          </span>
        </div>
        <button
          type="button"
          disabled={dayOffset === 0}
          onClick={() => setDayOffset((value) => Math.max(0, value - 1))}
          className="flex items-center justify-center gap-1 rounded-[12px] border border-white/8 bg-white/5 px-2 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span>{t("activity.nextDay")}</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </nav>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-white/8 bg-slate-950/20 px-3 py-2.5">
      <dt className="text-[11px] leading-4 text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-slate-50">{value}</dd>
    </div>
  );
}
