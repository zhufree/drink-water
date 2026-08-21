import { Armchair, Clock3, Footprints, PersonStanding } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import type { SedentaryActivityEvent, SedentaryStatus } from "../types";

type ActivityPanelProps = {
  status: SedentaryStatus;
};

type ActivitySegment = {
  event: SedentaryActivityEvent;
  durationMs: number;
};

const LONG_SITTING_MS = 30 * 60 * 1000;

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

export function ActivityPanel({ status }: ActivityPanelProps) {
  const { locale, t } = useI18n();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const segments = useMemo<ActivitySegment[]>(() => {
    const events = status.activityEvents
      .filter((event) => Number.isFinite(new Date(event.at).getTime()))
      .sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());

    return events.map((event, index) => {
      const startedAt = new Date(event.at).getTime();
      const nextEvent = events[index + 1];
      const endedAt = nextEvent ? new Date(nextEvent.at).getTime() : now;
      return { event, durationMs: Math.max(0, endedAt - startedAt) };
    });
  }, [now, status.activityEvents]);

  const totals = useMemo(() => {
    let sittingMs = 0;
    let standingMs = 0;
    let longestSittingMs = 0;

    for (const segment of segments) {
      if (segment.event.kind === "seated") {
        sittingMs += segment.durationMs;
        longestSittingMs = Math.max(longestSittingMs, segment.durationMs);
      } else {
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

  return (
    <section aria-labelledby="activity-title" className="space-y-3">
      <article className="panel-surface rounded-[18px] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
              {t("activity.todayOnly")}
            </p>
            <h1 id="activity-title" className="mt-1 text-xl font-bold text-white">
              {t("activity.title")}
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              {t("activity.description")}
            </p>
          </div>
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
        <div className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-sky-200" aria-hidden="true" />
          <h2 className="text-base font-bold text-white">{t("activity.timelineTitle")}</h2>
        </div>

        {segments.length === 0 ? (
          <div className="py-10 text-center" role="status">
            <Footprints className="mx-auto h-9 w-9 text-slate-500" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold text-slate-100">
              {t("activity.emptyTitle")}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-400">
              {t("activity.emptyDescription")}
            </p>
          </div>
        ) : (
          <ol className="mt-4" aria-label={t("activity.timelineTitle")}>
            {segments.map((segment, index) => {
              const seated = segment.event.kind === "seated";
              const longSitting = seated && segment.durationMs > LONG_SITTING_MS;
              const lineClass = seated
                ? longSitting
                  ? "border-rose-400"
                  : "border-amber-300"
                : "border-emerald-400";
              const badgeClass = seated
                ? longSitting
                  ? "bg-rose-400/15 text-rose-100"
                  : "bg-amber-300/15 text-amber-100"
                : "bg-emerald-400/15 text-emerald-100";

              return (
                <li key={`${segment.event.at}-${index}`}>
                  <div className="grid grid-cols-[32px_72px_1fr] items-center gap-2">
                    <span
                      className={`no-text-clarity flex h-8 w-8 items-center justify-center rounded-full border ${
                        seated
                          ? "border-amber-200/35 bg-amber-300/15 text-amber-100"
                          : "border-emerald-200/35 bg-emerald-300/15 text-emerald-100"
                      }`}
                    >
                      {seated ? (
                        <Armchair className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <PersonStanding className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                    <time className="font-mono text-xs text-slate-400" dateTime={segment.event.at}>
                      {formatTime(segment.event.at, locale)}
                    </time>
                    <span className="text-sm font-semibold text-slate-100">
                      {seated ? t("activity.satDown") : t("activity.stoodUp")}
                    </span>
                  </div>

                  <div className={`ml-[15px] border-l-2 py-3 pl-[25px] ${lineClass}`}>
                    <div className="flex items-center justify-between gap-3 rounded-[12px] bg-slate-950/25 px-3 py-2">
                      <span className="text-xs text-slate-300">
                        {seated ? t("activity.sittingPhase") : t("activity.standingPhase")}
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
                {formatTime(new Date(now).toISOString(), locale)}
              </time>
              <span className="text-sm font-semibold text-sky-100">{t("activity.now")}</span>
            </li>
          </ol>
        )}
      </article>
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
