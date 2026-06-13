import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Check, HelpCircle, Image, Lock, RotateCcw, X } from "lucide-react";
import { BACKGROUND_REWARDS } from "../config/backgroundRewards";
import { useI18n } from "../i18n";
import type { AppUpdateInfo, NotificationPermissionState, Settings, SyncMeta } from "../types";

type SettingsPanelProps = {
  draftSettings: Settings;
  activeBackground: string;
  unlockedBackgrounds: string[];
  reminderIntervalMinutes: number;
  drinksPerDay: number;
  version: string;
  updateInfo: AppUpdateInfo | null;
  copyright: string;
  releaseUrl: string;
  saving: boolean;
  notificationState: NotificationPermissionState;
  syncMeta: SyncMeta;
  pairCode: string;
  pairCodeInput: string;
  syncBusy: boolean;
  setDraftSettings: Dispatch<SetStateAction<Settings>>;
  onAutostartChange: (enabled: boolean) => void;
  onExportData: () => void;
  onImportData: () => void;
  onCreatePairCode: () => void;
  onPairCodeInputChange: (value: string) => void;
  onBindPairCode: () => void;
  onPullSyncNow: () => void;
  onPullSettingsNow: () => void;
  onUploadCloudBackup: () => void;
  onRestoreCloudBackup: () => void;
  onActiveBackgroundChange: (backgroundId: string) => void;
  onSave: () => void;
};

export function SettingsPanel({
  draftSettings,
  activeBackground,
  unlockedBackgrounds,
  reminderIntervalMinutes,
  drinksPerDay,
  version,
  updateInfo,
  copyright,
  releaseUrl,
  saving,
  notificationState,
  syncMeta,
  pairCode,
  pairCodeInput,
  syncBusy,
  setDraftSettings,
  onAutostartChange,
  onExportData,
  onImportData,
  onCreatePairCode,
  onPairCodeInputChange,
  onBindPairCode,
  onPullSyncNow,
  onPullSettingsNow,
  onUploadCloudBackup,
  onRestoreCloudBackup,
  onActiveBackgroundChange,
  onSave
}: SettingsPanelProps) {
  const [syncHelpOpen, setSyncHelpOpen] = useState(false);
  const { t, locale } = useI18n();
  const permissionLabel =
    notificationState === "granted"
      ? t("settings.permissionGranted")
      : notificationState === "denied"
        ? t("settings.permissionDenied")
        : notificationState === "unsupported"
          ? t("settings.permissionUnsupported")
          : t("settings.permissionPrompt");
  const maskedAccountId = syncMeta.accountId
    ? `${syncMeta.accountId.slice(0, 8)}${"*".repeat(24)}`
    : t("settings.cloudSyncAccountMissing");

  return (
    <section className="flex flex-col gap-3">
      {syncHelpOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="panel-surface max-w-[520px] rounded-[22px] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="m-0 text-lg font-semibold text-slate-50">
                  {t("onboarding.syncDetailsTitle")}
                </h3>
                <p className="mt-2 text-sm text-slate-300/78">
                  {t("onboarding.syncDetails")}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("settings.syncHelpClose")}
                onClick={() => setSyncHelpOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/8 text-slate-200 transition hover:bg-white/14"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="panel-surface rounded-[22px] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="m-0 text-lg font-semibold text-slate-50">{t("settings.title")}</h2>
            <p className="mt-1 text-sm text-slate-300/78">{t("settings.description")}</p>
          </div>
          <button
            onClick={onPullSettingsNow}
            disabled={syncBusy}
            className="shrink-0 rounded-[14px] border border-cyan-200/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:-translate-y-px hover:bg-cyan-300/16 disabled:opacity-60"
          >
            {t("settings.syncSettings")}
          </button>
        </div>
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
          <p className="mt-1 text-xs text-slate-300/60">{t("settings.panelOpacityHelp")}</p>
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
            <small className="text-xs text-slate-300/60">{t("settings.panelOpacityHelp")}</small>
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
            <small className="text-xs text-slate-300/60">{t("settings.panelBlurHelp")}</small>
          </label>
        </div>
      </div>

      <div className="panel-surface rounded-[22px] p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <strong className="text-sm font-semibold text-slate-50">{t("settings.backgroundTitle")}</strong>
            <p className="mt-1 text-xs text-slate-300/60">{t("settings.backgroundDescription")}</p>
          </div>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/8 text-cyan-100">
            <Image className="h-4 w-4" strokeWidth={2} />
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <button
            type="button"
            onClick={() => onActiveBackgroundChange("default")}
            className={`group overflow-hidden rounded-[18px] border p-2 text-left transition hover:-translate-y-px ${
              activeBackground === "default"
                ? "border-cyan-200/70 bg-cyan-300/12"
                : "border-white/10 bg-white/5 hover:bg-white/8"
            }`}
          >
            <span className="flex aspect-[4/5] items-center justify-center rounded-[14px] bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.28),transparent_36%),linear-gradient(145deg,#08101b,#152338_58%,#0c1726)]">
              <RotateCcw className="h-7 w-7 text-slate-100" strokeWidth={1.8} />
            </span>
            <span className="mt-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-100">{t("settings.backgroundDefault")}</span>
              {activeBackground === "default" ? (
                <Check className="h-4 w-4 text-cyan-100" strokeWidth={2.4} />
              ) : null}
            </span>
          </button>

          {BACKGROUND_REWARDS.map((reward) => {
            const unlocked = unlockedBackgrounds.includes(reward.id);
            const selected = activeBackground === reward.id;

            return (
              <button
                key={reward.id}
                type="button"
                disabled={!unlocked}
                onClick={() => onActiveBackgroundChange(reward.id)}
                className={`group overflow-hidden rounded-[18px] border p-2 text-left transition ${
                  unlocked ? "hover:-translate-y-px" : "cursor-not-allowed opacity-55"
                } ${
                  selected
                    ? "border-cyan-200/70 bg-cyan-300/12"
                    : "border-white/10 bg-white/5 hover:bg-white/8"
                }`}
              >
                <span className="relative block aspect-[4/5] overflow-hidden rounded-[14px] bg-slate-900">
                  <img
                    src={reward.preview}
                    alt={reward.title[locale] ?? reward.title["en-US"]}
                    className="h-full w-full object-cover"
                  />
                  {!unlocked ? (
                    <span className="absolute inset-0 grid place-items-center bg-slate-950/62">
                      <Lock className="h-5 w-5 text-slate-200" strokeWidth={2} />
                    </span>
                  ) : null}
                </span>
                <span className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-100">
                    {reward.title[locale] ?? reward.title["en-US"]}
                  </span>
                  {selected ? <Check className="h-4 w-4 text-cyan-100" strokeWidth={2.4} /> : null}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-300/60">{t("settings.backgroundHint")}</p>
      </div>

      <div className="panel-surface rounded-[22px] p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <strong className="text-sm font-semibold text-slate-50">{t("settings.cloudSyncTitle")}</strong>
            <p className="mt-2 text-sm text-slate-300/78">{t("settings.cloudSyncDescription")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={t("settings.syncHelpView")}
              onClick={() => setSyncHelpOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/8 text-slate-200 transition hover:bg-white/14"
            >
              <HelpCircle className="h-4 w-4" strokeWidth={1.9} />
            </button>
            <button
              onClick={onPullSyncNow}
              disabled={syncBusy}
              className="rounded-[14px] border border-cyan-200/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:-translate-y-px hover:bg-cyan-300/16 disabled:opacity-60"
            >
              {t("settings.cloudSyncPullNow")}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-[18px] bg-white/5 p-3 text-sm text-slate-300/78">
            <p className="m-0 text-slate-50">{t("settings.cloudSyncAccount")}</p>
            <p className="mt-2 break-all">{maskedAccountId}</p>
            {syncMeta.lastDailyPullAt ? (
              <p className="mt-2 text-xs text-slate-400">
                {t("settings.cloudSyncLastPull")}: {new Date(syncMeta.lastDailyPullAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <div className="rounded-[18px] bg-white/5 p-3 text-sm text-slate-300/78">
            <p className="m-0 text-slate-50">{t("settings.cloudSyncPairCode")}</p>
            <p className="mt-2 text-lg font-semibold tracking-[0.18em] text-cyan-100">
              {pairCode || t("settings.cloudSyncPairCodeMissing")}
            </p>
            <button
              onClick={onCreatePairCode}
              disabled={syncBusy}
              className="mt-3 rounded-[12px] border border-cyan-200/30 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:-translate-y-px hover:bg-cyan-300/16 disabled:opacity-60"
            >
              {t("settings.cloudSyncCreatePairCode")}
            </button>
          </div>
        </div>
        <div className="mt-3 rounded-[18px] bg-white/5 p-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={pairCodeInput}
              onChange={(event) => onPairCodeInputChange(event.target.value.toUpperCase())}
              placeholder={t("settings.cloudSyncPairCodePlaceholder")}
              className="flex-1 rounded-[14px] border border-white/12 bg-white/6 px-3 py-3 text-slate-50 outline-none"
            />
            <button
              onClick={onBindPairCode}
              disabled={syncBusy || !pairCodeInput.trim()}
              className="rounded-[14px] border border-emerald-200/30 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:-translate-y-px hover:bg-emerald-300/16 disabled:opacity-60"
            >
              {t("settings.cloudSyncBindDevice")}
            </button>
          </div>
        </div>
      </div>

      <div className="panel-surface rounded-[22px] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <strong className="text-sm font-semibold text-slate-50">{t("settings.dataTitle")}</strong>
            <p className="mt-2 text-sm text-slate-300/78">{t("settings.dataDescription")}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
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
          <button
            onClick={onUploadCloudBackup}
            disabled={syncBusy}
            className="rounded-[14px] border border-fuchsia-200/30 bg-fuchsia-300/10 px-4 py-3 text-sm font-semibold text-fuchsia-100 transition hover:-translate-y-px hover:bg-fuchsia-300/16 disabled:opacity-60"
          >
            {t("settings.cloudBackupUpload")}
          </button>
          <button
            onClick={onRestoreCloudBackup}
            disabled={syncBusy}
            className="rounded-[14px] border border-amber-200/30 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:-translate-y-px hover:bg-amber-300/16 disabled:opacity-60"
          >
            {t("settings.cloudBackupRestore")}
          </button>
          <button
            disabled={saving}
            onClick={onSave}
            className="no-text-clarity col-span-2 rounded-[14px] bg-gradient-to-r from-sky-300 to-emerald-300 px-5 py-3 font-semibold text-slate-950 transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? t("settings.saving") : t("settings.save")}
          </button>
        </div>
        {syncMeta.lastBackupAt ? (
          <p className="mt-3 text-xs text-slate-400">
            {t("settings.cloudBackupLast")}: {new Date(syncMeta.lastBackupAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      <div className="panel-surface rounded-[22px] p-4 text-sm text-slate-300/78">
        <p className="m-0">
          {t("settings.version", { version })}{" "}
          {updateInfo?.hasUpdate ? (
            <span className="mt-2 text-amber-200">
              ({t("settings.updateAvailable", { version: updateInfo.latestVersion })})
            </span>
          ) : null}
        </p>

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
