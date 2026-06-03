import type { Dispatch, SetStateAction } from "react";
import { useI18n } from "../i18n";
import type { AppUpdateInfo, NotificationPermissionState, Settings } from "../types";

type SettingsPanelProps = {
  draftSettings: Settings;
  activeBackground: string;
  reminderIntervalMinutes: number;
  drinksPerDay: number;
  version: string;
  updateInfo: AppUpdateInfo | null;
  copyright: string;
  releaseUrl: string;
  saving: boolean;
  notificationState: NotificationPermissionState;
  setDraftSettings: Dispatch<SetStateAction<Settings>>;
  onAutostartChange: (enabled: boolean) => void;
  onExportData: () => void;
  onImportData: () => void;
  onPreviewBackgroundChange: (backgroundId: string) => void;
  onSave: () => void;
};

export function SettingsPanel({
  draftSettings,
  activeBackground,
  reminderIntervalMinutes,
  drinksPerDay,
  version,
  updateInfo,
  copyright,
  releaseUrl,
  saving,
  notificationState,
  setDraftSettings,
  onAutostartChange,
  onExportData,
  onImportData,
  onPreviewBackgroundChange,
  onSave
}: SettingsPanelProps) {
  const { t } = useI18n();

  const permissionLabel =
    notificationState === "granted"
      ? t("settings.permissionGranted")
      : notificationState === "denied"
        ? t("settings.permissionDenied")
        : notificationState === "unsupported"
          ? t("settings.permissionUnsupported")
          : t("settings.permissionPrompt");

  return (
    <section className="flex flex-col gap-3">
      <div className="panel-surface rounded-[22px] p-4">
        <h2 className="m-0 text-lg font-semibold text-slate-50">{t("settings.title")}</h2>
        <p className="mt-1 text-sm text-slate-300/78">{t("settings.description")}</p>
      </div>

      <div className="panel-surface rounded-[22px] p-4">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <strong className="text-sm font-semibold text-slate-50">{t("settings.dailyTarget")}</strong>
            <p className="mt-1 text-xs text-slate-300/60">
              {t("settings.intervalHelp", {
                drinksPerDay,
                minutes: reminderIntervalMinutes
              })}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-2 rounded-[18px] bg-white/5 p-3">
            <span className="text-xs uppercase tracking-[0.16em] text-slate-300/60">
              {t("settings.dailyTarget")}
            </span>
            <input
              type="number"
              min={500}
              step={100}
              value={draftSettings.dailyTargetMl}
              onChange={(event) =>
                setDraftSettings((current) => ({
                  ...current,
                  dailyTargetMl: Number(event.target.value)
                }))
              }
              className="rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 outline-none"
            />
          </label>
          <label className="flex flex-col gap-2 rounded-[18px] bg-white/5 p-3">
            <span className="text-xs uppercase tracking-[0.16em] text-slate-300/60">
              {t("settings.cupSize")}
            </span>
            <input
              type="number"
              min={50}
              step={Math.max(10, draftSettings.cupStepMl)}
              value={draftSettings.cupSizeMl}
              onChange={(event) =>
                setDraftSettings((current) => ({
                  ...current,
                  cupSizeMl: Number(event.target.value)
                }))
              }
              className="rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 outline-none"
            />
          </label>
          <label className="flex flex-col gap-2 rounded-[18px] bg-white/5 p-3">
            <span className="text-xs uppercase tracking-[0.16em] text-slate-300/60">
              {t("settings.cupStep")}
            </span>
            <input
              type="number"
              min={10}
              step={10}
              value={draftSettings.cupStepMl}
              onChange={(event) =>
                setDraftSettings((current) => ({
                  ...current,
                  cupStepMl: Number(event.target.value)
                }))
              }
              className="rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 outline-none"
            />
          </label>
          <label className="flex flex-col gap-2 rounded-[18px] bg-white/5 p-3">
            <span className="text-xs uppercase tracking-[0.16em] text-slate-300/60">
              {t("settings.interval")}
            </span>
            <input
              type="number"
              value={reminderIntervalMinutes}
              readOnly
              className="rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 outline-none"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel-surface rounded-[22px] p-4">
          <div className="mb-4">
            <strong className="text-sm font-semibold text-slate-50">{t("settings.language")}</strong>
            <p className="mt-1 text-xs text-slate-300/60">
              {t("settings.startHour")} / {t("settings.endHour")}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-2 rounded-[18px] bg-white/5 p-3">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-300/60">
                {t("settings.language")}
              </span>
              <select
                value={draftSettings.locale}
                onChange={(event) =>
                  setDraftSettings((current) => ({
                    ...current,
                    locale: event.target.value as Settings["locale"]
                  }))
                }
                className="rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 outline-none"
              >
                <option value="zh-CN" className="bg-slate-900">
                  {t("settings.languageZhCn")}
                </option>
                <option value="en-US" className="bg-slate-900">
                  {t("settings.languageEnUs")}
                </option>
              </select>
            </label>
            <label className="flex flex-col gap-2 rounded-[18px] bg-white/5 p-3">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-300/60">
                {t("settings.startHour")}
              </span>
              <input
                type="number"
                min={0}
                max={23}
                value={draftSettings.activeStartHour}
                onChange={(event) =>
                  setDraftSettings((current) => ({
                    ...current,
                    activeStartHour: Number(event.target.value)
                  }))
                }
                className="rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 outline-none"
              />
            </label>
            <label className="flex flex-col gap-2 rounded-[18px] bg-white/5 p-3">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-300/60">
                {t("settings.endHour")}
              </span>
              <input
                type="number"
                min={1}
                max={23}
                value={draftSettings.activeEndHour}
                onChange={(event) =>
                  setDraftSettings((current) => ({
                    ...current,
                    activeEndHour: Number(event.target.value)
                  }))
                }
                className="rounded-[14px] border border-white/12 bg-white/6 px-3 py-2 text-slate-50 outline-none"
              />
            </label>
          </div>
        </div>

        <div className="panel-surface rounded-[22px] p-4">
          <div className="mb-4">
            <strong className="text-sm font-semibold text-slate-50">{t("settings.notifications")}</strong>
            <p className="mt-1 text-xs text-slate-300/60">{t("settings.permissionTitle")}</p>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 rounded-[18px] bg-white/5 px-3 py-3">
              <span className="text-sm text-slate-200">{t("settings.notifications")}</span>
              <input
                type="checkbox"
                checked={draftSettings.notificationsEnabled}
                onChange={(event) =>
                  setDraftSettings((current) => ({
                    ...current,
                    notificationsEnabled: event.target.checked
                  }))
                }
                className="h-4 w-4"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-[18px] bg-white/5 px-3 py-3">
              <span className="text-sm text-slate-200">{t("settings.autostart")}</span>
              <input
                type="checkbox"
                checked={draftSettings.autostartEnabled}
                onChange={(event) => onAutostartChange(event.target.checked)}
                className="h-4 w-4"
              />
            </label>
            <div className="rounded-[18px] bg-white/5 px-3 py-3">
              <strong className="text-sm font-semibold text-slate-50">
                {t("settings.permissionTitle")}
              </strong>
              <p className="mt-2 text-sm text-slate-300/78">
                {t("settings.permissionStatus", { status: permissionLabel })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-surface rounded-[22px] p-4">
        <div className="mb-4">
          <strong className="text-sm font-semibold text-slate-50">{t("settings.panelOpacity")}</strong>
          <p className="mt-1 text-xs text-slate-300/60">
            {t("settings.panelOpacityHelp")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <label className="flex flex-col gap-2 rounded-[18px] bg-white/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-300/70">{t("settings.panelOpacity")}</span>
            <strong className="text-sm font-semibold text-slate-50">
              {draftSettings.panelOpacityPercent}%
            </strong>
          </div>
          <input
            type="range"
            min={10}
            max={92}
            step={1}
            value={draftSettings.panelOpacityPercent}
            onChange={(event) =>
              setDraftSettings((current) => ({
                ...current,
                panelOpacityPercent: Number(event.target.value)
              }))
            }
            className="accent-cyan-300"
          />
          <small className="text-xs text-slate-300/60">
            {t("settings.panelOpacityHelp")}
          </small>
        </label>

        <label className="flex flex-col gap-2 rounded-[18px] bg-white/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-300/70">{t("settings.panelBlur")}</span>
            <strong className="text-sm font-semibold text-slate-50">
              {draftSettings.panelBlurPx}px
            </strong>
          </div>
          <input
            type="range"
            min={0}
            max={24}
            step={1}
            value={draftSettings.panelBlurPx}
            onChange={(event) =>
              setDraftSettings((current) => ({
                ...current,
                panelBlurPx: Number(event.target.value)
              }))
            }
            className="accent-cyan-300"
          />
          <small className="text-xs text-slate-300/60">
            {t("settings.panelBlurHelp")}
          </small>
        </label>
        </div>
      </div>

      <div className="panel-surface rounded-[22px] p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <strong className="text-sm font-semibold text-slate-50">{t("settings.dataTitle")}</strong>
            <p className="mt-2 text-sm text-slate-300/78">{t("settings.dataDescription")}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={onExportData}
                className="rounded-[14px] border border-cyan-200/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:-translate-y-px hover:bg-cyan-300/16"
              >
                {t("settings.exportData")}
              </button>
              <button
                onClick={onImportData}
                className="rounded-[14px] border border-emerald-200/30 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:-translate-y-px hover:bg-emerald-300/16"
              >
                {t("settings.importData")}
              </button>
            </div>
          </div>
          <button
            disabled={saving}
            onClick={onSave}
            className="no-text-clarity w-full rounded-[14px] bg-gradient-to-r from-sky-300 to-emerald-300 px-5 py-3 font-semibold text-slate-950 transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
          >
            {saving ? t("settings.saving") : t("settings.save")}
          </button>
        </div>
      </div>

      <div className="panel-surface rounded-[22px] p-4 text-sm text-slate-300/78">
        <p className="m-0">{t("settings.version", { version })} {updateInfo?.hasUpdate ? (
          <span className="mt-2 text-amber-200">
            ({t("settings.updateAvailable", { version: updateInfo.latestVersion })})
          </span>
        ) : null}</p>
        
        {updateInfo?.hasUpdate && updateInfo.notes ? (
          <p className="mt-2 text-slate-300/74">{updateInfo.notes}</p>
        ) : null}
        <p className="mt-2">{copyright}</p>
        <a
          href={updateInfo?.hasUpdate ? updateInfo.releaseUrl : releaseUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex text-cyan-200 underline decoration-cyan-200/50 underline-offset-4 transition hover:text-cyan-100"
        >
          {updateInfo?.hasUpdate ? t("settings.downloadUpdate") : t("settings.downloadLatest")}
        </a>
      </div>
    </section>
  );
}
